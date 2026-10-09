#!/usr/bin/env python3
"""
Turns a raw Jira export (.jira-import/*.json) into historical projects for the seed
(seed/jira-<project>/estimacion.json + markdown sources).

Jira has story points but no worklogs, so "actual" hours are estimated from the
team's velocity: each sprint's capacity (people x hours/day x business days) is
distributed among the epics according to the story points each one closed in that
sprint (developers by the issues they closed, UX/QA by the team's share).
"Estimated" hours are story points x hoursPerStoryPoint.

Usage: python3 -I scripts/jira-to-seed.py [.jira-import] [seed]
"""
import json
import math
import re
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

RAW = Path(sys.argv[1] if len(sys.argv) > 1 else '.jira-import')
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'seed')
HOURS_PER_DAY = {'FT': 8, 'PT': 4}
DEV_ROLES = ['UX', 'FRONTEND', 'BACKEND', 'QA']
FE_WORDS = ['interfaz', 'pantalla', 'vista', 'modal', 'ui', 'ux', 'front', 'botón', 'boton', 'formulario',
            'diseño', 'menú', 'menu', 'sidebar', 'tabla', 'responsive', 'navegación', 'navegacion', 'visualiz']
BE_WORDS = ['endpoint', 'api', 'backend', 'integración', 'integracion', 'migración', 'migracion', 'base de datos',
            'servicio', 'webhook', 'bot', 'ocr', 'job', 'cron', 'infra', 'deploy', 's3', 'lambda', 'modelo',
            'prompt', 'arquitectura', 'whatsapp', 'usuarios en', 'script']


def load(name):
    return json.loads((RAW / name).read_text(encoding='utf-8'))


def parse_day(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).date() if value else None


def business_days(start: date, end: date) -> int:
    days, d = 0, start
    while d < end:
        if d.weekday() < 5:
            days += 1
        d += timedelta(days=1)
    return days


config = json.loads((RAW / 'config.json').read_text(encoding='utf-8'))
issues = load('issues.json')
epics = {e['key']: e for e in load('epics.json')}
sprints = {s['id']: s for s in load('sprints.json')}
goals_file = RAW / 'sprint-goals.json'
sprint_goals = {g['id']: g.get('goal') or '' for g in (json.loads(goals_file.read_text()) if goals_file.exists() else [])}
hps = config['hoursPerStoryPoint']

# ---------- anonymization: client names and people -> generic labels
ROLE_LABEL = {'FRONTEND': 'desarrollo', 'BACKEND': 'desarrollo', 'UX': 'UX', 'PM': 'PM', 'QA': 'QA'}
replacements = [(w, config['clientAlias']) for w in config.get('anonymize', [])]
for person in config['people']:
    label = f"el equipo de {ROLE_LABEL[person['roles'][0]]}"
    for alias in person['match']:
        replacements.append((alias, label))
        first = alias.split()[0]
        if len(first) > 3:
            replacements.append((first, label))
issue_names = {i['assigneeName'] for i in issues if i.get('assigneeName')}
for name in issue_names:
    replacements.append((name.lower(), 'una persona del equipo'))
replacements.sort(key=lambda r: -len(r[0]))


URL_RE = re.compile(r'(?:https?://|www\.)[^\s<>()\[\]"\']+', re.IGNORECASE)
DOMAIN_RE = re.compile(r'(?<![\w@])[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|io|ai|app|video|ar|cl|co|dev|cloud)(?:/[^\s<>()]*)?\b', re.IGNORECASE)
EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')
MENTION_RE = re.compile(r'\[~(?:accountid:)?[^\]]+\]|@[A-Za-zÁÉÍÓÚáéíóúÑñ]+(?:\s[A-Z][a-záéíóúñ]+)?', re.IGNORECASE)


def anon(text):
    """Removes links, emails, Jira mentions and configured names (client, people)."""
    if not text:
        return ''
    text = URL_RE.sub('[enlace]', text)
    text = EMAIL_RE.sub('[email]', text)
    text = DOMAIN_RE.sub('[enlace]', text)
    text = MENTION_RE.sub('[persona]', text)
    for word, repl in replacements:
        # whole words only, so short names don't break other words
        text = re.sub(rf'(?<!\w){re.escape(word)}(?!\w)', repl, text, flags=re.IGNORECASE)
    return text


# ---------- people
def person_of(name):
    if not name:
        return None
    low = name.lower()
    return next((p for p in config['people'] if any(m in low for m in p['match'])), None)


unknown_people = sorted({i['assigneeName'] for i in issues if i.get('assigneeName') and not person_of(i['assigneeName'])})

# ---------- project of each issue
def project_of_epic(epic_key):
    if epic_key in config['sharedEpics']:
        return 'SHARED'
    summary = epics.get(epic_key, {}).get('summary', '')
    for code, p in config['projects'].items():
        if summary.upper().startswith(p['epicPrefix'].upper()):
            return code
    return 'SHARED'


product_votes = defaultdict(lambda: defaultdict(int))
for i in issues:
    if i.get('epicKey') and i.get('product'):
        product_votes[i['product']][project_of_epic(i['epicKey'])] += 1


def project_of(issue):
    if issue.get('epicKey'):
        return project_of_epic(issue['epicKey'])
    votes = product_votes.get(issue.get('product') or '')
    if votes:
        best = max(votes.items(), key=lambda kv: kv[1])[0]
        if best != 'SHARED':
            return best
    return 'SHARED'


def module_of(issue):
    return issue.get('epicKey') or f"__noepic__{project_of(issue)}"


def fe_share(issue):
    text = f"{issue.get('summary', '')} {issue.get('description', '')}".lower()
    fe = sum(text.count(w) for w in FE_WORDS)
    be = sum(text.count(w) for w in BE_WORDS)
    if fe + be == 0:
        return 0.5
    return round(fe / (fe + be), 2)


# ---------- sprint in which each issue was completed
ordered_sprints = sorted(sprints.values(), key=lambda s: s['startDate'] or '')
today = date.today()
for idx, s in enumerate(ordered_sprints):
    s['_start'] = parse_day(s['startDate'])
    s['_end'] = parse_day(s.get('completeDate') or s['endDate'])
    # capacity window: planned end, cut at the next sprint start and at today (sprints overlap in Jira)
    ends = [d for d in (parse_day(s['endDate']), parse_day(s.get('completeDate')), today) if d]
    nxt = ordered_sprints[idx + 1]['startDate'] if idx + 1 < len(ordered_sprints) else None
    if nxt:
        ends.append(parse_day(nxt))
    s['_cap_end'] = min(ends) if ends else s['_end']


def completion_sprint(issue):
    resolved = parse_day(issue.get('resolved'))
    candidates = [sprints[sid] for sid in issue.get('sprintIds', []) if sid in sprints]
    if resolved:
        for s in candidates or ordered_sprints:
            if s['_start'] and s['_end'] and s['_start'] <= resolved <= s['_end'] + timedelta(days=3):
                return s['id']
    if candidates:
        return max(candidates, key=lambda s: s['_start'] or date.min)['id']
    if resolved:
        before = [s for s in ordered_sprints if s['_start'] and s['_start'] <= resolved]
        if before:
            return before[-1]['id']
    return None


active_window = {}
for i in issues:
    person = person_of(i.get('assigneeName'))
    resolved = parse_day(i.get('resolved'))
    if person is not None and resolved:
        key = id(person)
        lo, hi = active_window.get(key, (resolved, resolved))
        active_window[key] = (min(lo, resolved), max(hi, resolved))

for i in issues:
    i['_sp'] = i.get('storyPoints') or 0
    i['_sprint'] = completion_sprint(i)
    i['_module'] = module_of(i)
    i['_project'] = project_of(i)
    i['_fe'] = fe_share(i)
    i['_carried'] = max(0, len(i.get('sprintIds') or []) - 1)
    i['_person'] = person_of(i.get('assigneeName'))

# ---------- actual hours: sprint capacity distributed by closed story points
actual = defaultdict(lambda: defaultdict(float))  # module -> role -> hours
unattributed = 0.0
pm_hours = 0.0
dev_people = [p for p in config['people'] if set(p['roles']) & {'FRONTEND', 'BACKEND'}]
# the team that was sold: occasional collaborators (onlyWhileActive) don't count
core_devs = [p for p in dev_people if not p.get('onlyWhileActive')]
for s in ordered_sprints:
    if not (s['_start'] and s['_end']):
        continue
    days = business_days(s['_start'], s['_cap_end'])
    closed = [i for i in issues if i['_sprint'] == s['id'] and i['_sp'] > 0]
    team_sp = defaultdict(float)
    for i in closed:
        team_sp[i['_module']] += i['_sp']
    total_sp = sum(team_sp.values())
    for person in config['people']:
        if person.get('onlyWhileActive'):
            window = active_window.get(id(person))
            if not window or s['_cap_end'] < window[0] - timedelta(days=14) or s['_start'] > window[1]:
                continue
        capacity = days * HOURS_PER_DAY[person['dedication']]
        if 'PM' in person['roles']:
            pm_hours += capacity
            continue
        if total_sp == 0:
            unattributed += capacity
            continue
        roles = person['roles']
        own = [i for i in closed if i['_person'] is person]
        own_sp = sum(i['_sp'] for i in own)
        pool = own if own_sp > 0 else closed
        pool_sp = own_sp if own_sp > 0 else total_sp
        for i in pool:
            hours = capacity * i['_sp'] / pool_sp
            if 'FRONTEND' in roles and 'BACKEND' in roles:
                actual[i['_module']]['FRONTEND'] += hours * i['_fe']
                actual[i['_module']]['BACKEND'] += hours * (1 - i['_fe'])
            else:
                actual[i['_module']][roles[0]] += hours

# ---------- estimated hours: story points x hours per point
estimated = defaultdict(lambda: defaultdict(float))
stats = defaultdict(lambda: {'issues': 0, 'sp': 0, 'bugs': 0, 'carried': 0, 'noSp': 0})
for i in issues:
    m = i['_module']
    hours = i['_sp'] * hps
    roles = i['_person']['roles'] if i['_person'] else (['UX'] if 'ux' in (i.get('type') or '').lower() else ['FRONTEND', 'BACKEND'])
    if 'FRONTEND' in roles and 'BACKEND' in roles:
        estimated[m]['FRONTEND'] += hours * i['_fe']
        estimated[m]['BACKEND'] += hours * (1 - i['_fe'])
    elif roles[0] in DEV_ROLES:
        estimated[m][roles[0]] += hours
    st = stats[m]
    st['issues'] += 1
    st['sp'] += i['_sp']
    st['bugs'] += 1 if i.get('type', '').lower() in ('bug', 'error') else 0
    st['carried'] += 1 if i['_carried'] > 0 else 0
    st['noSp'] += 1 if i['_sp'] == 0 else 0
# roles that rarely estimate in story points (QA) get a share of development
for m, hours in estimated.items():
    dev = hours['FRONTEND'] + hours['BACKEND']
    for role, ratio in config.get('estimateRatios', {}).items():
        hours[role] += dev * ratio


def module_name(m):
    if m.startswith('__noepic__'):
        return 'Tareas transversales (sin épica)'
    summary = epics.get(m, {}).get('summary', m)
    return anon(re.sub(r'^(CLUB|BOT)\s*-\s*', '', summary, flags=re.IGNORECASE).strip())


def rounded(hours):
    return {r: int(round(hours.get(r, 0))) for r in DEV_ROLES}


def complexity(sp):
    return 'LOW' if sp < 15 else 'MEDIUM' if sp <= 50 else 'HIGH'


# ---------- assemble each project (shared modules split by story points)
project_sp = defaultdict(float)
for i in issues:
    if i['_project'] != 'SHARED':
        project_sp[i['_project']] += i['_sp']
sp_total = sum(project_sp.values()) or 1

report = {'unknownPeople': unknown_people, 'unattributedHours': round(unattributed), 'projects': {}}
for code, pconf in config['projects'].items():
    share = project_sp[code] / sp_total
    modules = []
    module_keys = sorted({m for m in stats if (m.startswith('__noepic__') and m.endswith(code)) or
                          (not m.startswith('__noepic__') and project_of_epic(m) == code)},
                         key=lambda m: -stats[m]['sp'])
    shared_keys = sorted({m for m in stats if (m.startswith('__noepic__') and m.endswith('SHARED')) or
                          (not m.startswith('__noepic__') and project_of_epic(m) == 'SHARED')})
    for m, factor in [(k, 1.0) for k in module_keys] + [(k, share) for k in shared_keys]:
        st = stats[m]
        est = rounded({r: v * factor for r, v in estimated[m].items()})
        act = rounded({r: v * factor for r, v in actual[m].items()})
        if sum(est.values()) == 0 and sum(act.values()) == 0:
            continue
        sp = st['sp'] * factor
        est_total, act_total = sum(est.values()), sum(act.values())
        deviation = (act_total - est_total) / est_total * 100 if est_total else None
        carried_pct = st['carried'] / st['issues'] * 100 if st['issues'] else 0
        name = module_name(m) + (f' (parte de {pconf["epicPrefix"]})' if factor < 1 else '')
        notes = (f"{st['issues']} tarjetas finalizadas, {round(sp)} SP"
                 f"{f', {st['bugs']} bugs' if st['bugs'] else ''}; "
                 f"{round(carried_pct)} % de las tarjetas se arrastró a otro sprint"
                 f"{f'; {st['noSp']} sin story points' if st['noSp'] else ''}. "
                 f"Real estimado por velocidad: {act_total} h vs {est_total} h por story points"
                 f"{f' ({deviation:+.0f} %)' if deviation is not None else ''}.")
        descr_issues = [i for i in issues if i['_module'] == m]
        description = anon('; '.join(i['summary'] for i in sorted(descr_issues, key=lambda i: -i['_sp'])[:6]))
        modules.append({
            'name': name, 'description': description[:600], 'complexity': complexity(sp),
            'estimatedHours': est, 'actualHours': act, 'notes': notes,
            '_carried': carried_pct, '_dev': deviation, '_key': m, '_factor': factor,
        })

    total_est = sum(sum(m['estimatedHours'].values()) for m in modules)
    total_act = sum(sum(m['actualHours'].values()) for m in modules)
    proj_sp = sum(stats[m['_key']]['sp'] * m['_factor'] for m in modules)
    dev_act = sum(m['actualHours']['FRONTEND'] + m['actualHours']['BACKEND'] for m in modules)
    lessons = []
    if proj_sp:
        lessons.append(f"Velocidad real del equipo: ~{dev_act / proj_sp:.1f} h de desarrollo por story point "
                       f"(se estimó con {hps} h/SP). Usar ese factor para convertir puntos a horas en proyectos similares.")
    worst = sorted([m for m in modules if m['_dev'] is not None], key=lambda m: -m['_dev'])[:3]
    for m in worst:
        lessons.append(f"{m['name']}: el esfuerzo real superó en {m['_dev']:.0f} % a lo estimado en story points; "
                       f"{m['_carried']:.0f} % de sus tarjetas se arrastró a otro sprint.")
    carried = [m for m in modules if m['_carried'] >= 40]
    if carried:
        lessons.append('Módulos con muchas tarjetas arrastradas entre sprints (subestimación o bloqueos): '
                       + ', '.join(m['name'] for m in carried) + '.')

    # team sold: two full-stack developers count as one FRONTEND + one BACKEND
    team = []
    devs = len(core_devs)
    if devs:
        team.append({'role': 'FRONTEND', 'seniority': core_devs[0]['seniority'], 'count': max(1, math.ceil(devs / 2)), 'dedication': 'FT'})
        team.append({'role': 'BACKEND', 'seniority': core_devs[0]['seniority'], 'count': max(1, math.ceil(devs / 2)), 'dedication': 'FT'})
    for p in config['people']:
        if p not in dev_people and not p.get('onlyWhileActive'):
            team.append({'role': p['roles'][0], 'seniority': p['seniority'], 'count': 1, 'dedication': p['dedication']})

    data = {
        'project': {
            'code': pconf['code'], 'name': pconf['name'], 'client': config['clientAlias'],
            'industry': config['industry'], 'year': config['year'],
            'summary': anon(f"Proyecto importado desde Jira (tablero AD3, solo tarjetas finalizadas): {len(modules)} módulos "
                            f"(épicas), {round(proj_sp)} story points. Horas reales estimadas por la velocidad del equipo "
                            f"porque Jira no tiene horas cargadas."),
        },
        'parameters': {'pmOverheadPct': 15, 'contingencyPct': 0},
        'team': team,
        'modules': [{k: v for k, v in m.items() if not k.startswith('_')} for m in modules],
        'lessons': lessons,
    }

    folder = OUT / f"jira-{code.lower()}"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / 'estimacion.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    # sources: scope by epic, sprints and closing summary
    scope = [f"# Alcance por épica — {pconf['name']}\n"]
    for m in modules:
        scope.append(f"\n## {m['name']}\n")
        for i in sorted((i for i in issues if i['_module'] == m['_key']), key=lambda i: i['key']):
            scope.append(f"\n### {anon(i['summary'])} ({i['_sp'] or 's/'} SP)\n")
            if i.get('description'):
                scope.append(anon(i['description'])[:900] + '\n')
    (folder / '01-alcance-por-epica.md').write_text(''.join(scope), encoding='utf-8')

    sprint_doc = [f"# Sprints — {pconf['name']}\n"]
    for s in ordered_sprints:
        sp_closed = sum(i['_sp'] for i in issues if i['_sprint'] == s['id'] and i['_project'] in (code, 'SHARED'))
        sprint_doc.append(f"\n## {s['name']} ({s['_start']} a {s['_end']})\n\nStory points cerrados: {round(sp_closed)}.\n")
        if sprint_goals.get(s['id']):
            sprint_doc.append('\n' + anon(sprint_goals[s['id']]) + '\n')
    (folder / '02-sprints.md').write_text(''.join(sprint_doc), encoding='utf-8')

    closing = [f"# Cierre y lecciones — {pconf['name']}\n\n",
               f"Total estimado por story points: {total_est} h · total real estimado por velocidad: {total_act} h.\n\n",
               "| Módulo | SP | Estimado (h) | Real (h) | Desvío | Arrastradas |\n|---|---|---|---|---|---|\n"]
    for m in modules:
        e, a = sum(m['estimatedHours'].values()), sum(m['actualHours'].values())
        closing.append(f"| {m['name']} | {round(stats[m['_key']]['sp'] * m['_factor'])} | {e} | {a} | "
                       f"{'' if m['_dev'] is None else f'{m['_dev']:+.0f} %'} | {m['_carried']:.0f} % |\n")
    closing.append('\n## Lecciones aprendidas\n\n' + ''.join(f'- {l}\n' for l in lessons))
    (folder / '04-cierre-y-lecciones.md').write_text(''.join(closing), encoding='utf-8')

    report['projects'][code] = {
        'folder': str(folder), 'modules': len(modules), 'storyPoints': round(proj_sp),
        'estimatedHours': total_est, 'actualHours': total_act,
        'hoursPerSP': round(dev_act / proj_sp, 1) if proj_sp else None,
    }

report['pmHours'] = round(pm_hours)
print(json.dumps(report, ensure_ascii=False, indent=2))
