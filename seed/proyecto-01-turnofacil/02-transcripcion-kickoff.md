# Transcripción — Reunión de kickoff TurnoFácil

**Proyecto:** TurnoFácil (P-2024-07) — Red de Clínicas Del Valle
**Fecha:** 9 de abril de 2024
**Modalidad:** videollamada grabada
**Duración:** 45 min aprox.

**Participantes:**

- **Dra. Mariana Ferraro** — Directora Médica (cliente)
- **Gustavo Peralta** — Jefe de Sistemas (cliente)
- **Lucía Benítez** — Project Manager (equipo)
- **Martín Ríos** — Tech Lead (equipo)

> Transcripción automática revisada. Se omitieron saludos iniciales y cortes de audio.

---

[00:42] Lucía Benítez: Bueno, gracias por el tiempo. La idea de hoy es repasar el brief que nos mandaron, entender bien cómo funcionan las agendas y salir con lo necesario para armar la propuesta formal. ¿Les parece si arrancamos por cómo se da un turno hoy?

[01:05] Dra. Mariana Ferraro: Sí, dale. Hoy el paciente llama a la sede, la recepcionista abre la agenda del profesional, que en algunas sedes está en el sistema de escritorio y en otras en una planilla, y le ofrece los horarios libres. Si no hay, le dice que llame la semana que viene. Así de simple y así de malo.

[01:31] Martín Ríos: ¿Cada profesional tiene un horario fijo por sede? Por ejemplo, el cardiólogo atiende lunes y miércoles en Centro y jueves en Norte.

[01:40] Dra. Mariana Ferraro: Exacto. Algunos atienden en una sola sede y otros rotan. Y cada especialidad tiene una duración de turno distinta: clínica son 15 minutos, kinesiología 30, cardiología con electro 20.

[01:58] Martín Ríos: Perfecto, entonces la disponibilidad la armamos por profesional, sede y especialidad, con la duración del slot configurable. ¿Un mismo profesional puede tener más de una especialidad?

[02:10] Dra. Mariana Ferraro: Pocos, pero sí. Tenemos un clínico que también hace medicina del deporte.

[02:18] Lucía Benítez: Vamos con el flujo del paciente. ¿Qué tiene que poder hacer desde la web?

[02:24] Dra. Mariana Ferraro: Buscar por especialidad, profesional o sede, elegir el horario, confirmar. Y después poder cancelar o cambiar el turno sin llamar.

[02:36] Martín Ríos: ¿Hay alguna anticipación mínima para cancelar? Tipo "no se puede cancelar con menos de 2 horas".

[02:43] Dra. Mariana Ferraro: Pongamos 2 horas, sí. Menos de eso que llame.

[02:49] Gustavo Peralta: Una cosa, para que lo tengan en cuenta: a las 8 de la mañana, cuando se liberan las agendas, hay mucha gente queriendo el mismo turno. Hoy por teléfono no pasa, pero online sí va a pasar.

[03:02] Martín Ríos: Sí, lo anotamos. Hay que controlar que dos pacientes no reserven el mismo horario al mismo tiempo. Lo resolvemos del lado del backend.

[03:15] Dra. Mariana Ferraro: Ah, y algunos profesionales dan sobreturnos. Pero eso lo maneja cada uno, no sé si hace falta en el sistema.

[03:22] Lucía Benítez: ¿Los sobreturnos los da la recepcionista o el profesional?

[03:26] Dra. Mariana Ferraro: Depende de la sede, la verdad. Lo vemos más adelante, no es lo central.

[03:32] Lucía Benítez: Ok, lo dejo anotado como tema a revisar. Hablemos de roles. Entiendo que tenemos pacientes, profesionales, recepcionistas y administración.

[03:44] Gustavo Peralta: Sí. Y yo agregaría un rol de administrador de sistemas, que soy yo y una persona más, para dar de alta usuarios internos.

[03:53] Martín Ríos: ¿Los profesionales qué ven? ¿Solo su agenda?

[03:57] Dra. Mariana Ferraro: Su agenda del día y de la semana, y poder marcar si el paciente vino o no. Eso es clave para medir el ausentismo.

[04:08] Martín Ríos: Y la recepcionista puede dar turnos en nombre de un paciente, buscarlo por DNI, y cargar uno nuevo si no existe.

[04:16] Dra. Mariana Ferraro: Exacto. Tenemos muchos pacientes mayores que no van a usar la web.

[04:24] Lucía Benítez: Para el registro del paciente, en el brief mencionaron email y Google.

[04:29] Gustavo Peralta: Sí, Google si no complica. Y recupero de contraseña, obvio, porque si no nos llaman a nosotros.

[04:37] Martín Ríos: No complica, es estándar.

[05:02] Lucía Benítez: Coberturas. ¿Qué necesitan registrar?

[05:07] Dra. Mariana Ferraro: La obra social o prepaga, el plan y el número de afiliado. Y no todos los profesionales aceptan todas las coberturas, eso es importante.

[05:18] Martín Ríos: O sea que cuando el paciente busca turno, filtramos los profesionales que aceptan su cobertura.

[05:24] Dra. Mariana Ferraro: Sí, y que se pueda elegir "particular" también.

[05:29] Lucía Benítez: ¿Hay que validar la cobertura contra la obra social, que el afiliado esté activo?

[05:35] Gustavo Peralta: No, eso no. Eso se hace en el mostrador el día del turno. Y facturación tampoco, eso sigue en el sistema administrativo.

[05:44] Lucía Benítez: Perfecto, facturación queda afuera.

[06:30] Lucía Benítez: Vamos a notificaciones, que en el brief aparece como algo muy importante.

[06:36] Dra. Mariana Ferraro: Es lo más importante para nosotros. Tenemos un 22 % de ausentismo. Si el paciente recibe un WhatsApp el día anterior y puede contestar "no voy", ya ganamos mucho.

[06:49] Martín Ríos: Para hacerlo bien hay que usar la API oficial de WhatsApp Business. ¿Tienen una cuenta de WhatsApp Business verificada?

[06:57] Gustavo Peralta: Tenemos un número que usa la recepción de Centro con la app de WhatsApp Business, pero la API no. Eso lo tramitamos nosotros, no se preocupen.

[07:08] Martín Ríos: Ok. Tengan en cuenta que hay que verificar la empresa con Meta y que las plantillas de mensajes las tienen que aprobar ellos. A veces tarda.

[07:17] Gustavo Peralta: Sí, sí, lo arrancamos esta semana.

[07:22] Lucía Benítez: Entonces la idea sería: confirmación al reservar, por email y WhatsApp, y recordatorio 24 horas antes por los dos canales.

[07:31] Dra. Mariana Ferraro: Sí. Y que desde el WhatsApp pueda tocar "confirmo" o "cancelo".

[07:37] Martín Ríos: Eso implica recibir las respuestas por webhook y cancelar el turno automáticamente. Lo contemplamos.

[07:45] Gustavo Peralta: ¿Y SMS?

[07:48] Dra. Mariana Ferraro: No, SMS no. Nadie los lee.

[07:52] Lucía Benítez: Ok, SMS fuera de alcance.

[09:10] Lucía Benítez: Pasemos al backoffice. ¿Quién mantiene profesionales, especialidades y horarios?

[09:16] Gustavo Peralta: Administración de cada sede, con supervisión de Dirección. Necesitan dar de alta profesionales, asignarles sedes, especialidades, horarios y coberturas.

[09:28] Martín Ríos: ¿Y cuando un profesional se toma vacaciones o tiene un congreso?

[09:33] Dra. Mariana Ferraro: Uh, eso. Hoy se tacha la agenda y se llama a los pacientes uno por uno. Lo de licencias lo vemos después, hay que ver cómo lo maneja cada sede.

[09:44] Lucía Benítez: Lo dejo como pendiente junto con sobreturnos. Si cambia algo lo conversamos.

[09:50] Dra. Mariana Ferraro: Dale.

[11:20] Lucía Benítez: Ficha del paciente. ¿Qué quieren ver?

[11:24] Dra. Mariana Ferraro: Datos personales, cobertura, historial de turnos y si asistió. Nada clínico, eso queda en la historia clínica.

[11:35] Martín Ríos: ¿Hay que integrarse con el sistema de historia clínica?

[11:39] Gustavo Peralta: No, por ahora no. Es un sistema de un proveedor externo y no tiene API decente. Quizás en una segunda etapa.

[11:48] Lucía Benítez: Entonces integración con historia clínica fuera de alcance.

[13:05] Lucía Benítez: Reportes. ¿Qué necesita la Dirección?

[13:09] Dra. Mariana Ferraro: Ocupación por sede y por profesional, ausentismo por período, por especialidad. Y bajarlo a Excel, porque el directorio quiere todo en Excel.

[13:20] Martín Ríos: Un dashboard con filtros por fecha, sede y profesional, más exportación. Nada de BI complejo.

[13:27] Dra. Mariana Ferraro: Exacto, algo simple.

[15:40] Lucía Benítez: Gustavo, infraestructura. En el brief dicen que tienen AWS.

[15:45] Gustavo Peralta: Sí, tenemos una cuenta donde corre el sitio institucional. Lo administro yo. Les damos un usuario con los permisos que necesiten.

[15:55] Martín Ríos: Bárbaro. Proponemos dos ambientes, staging y producción, con base PostgreSQL gestionada, pipeline de CI/CD, backups diarios y monitoreo básico. ¿Tienen políticas de IAM restrictivas?

[16:08] Gustavo Peralta: Algunas, por auditoría. Pero lo resolvemos sobre la marcha.

[16:14] Martín Ríos: Ok. Stack: React con TypeScript en el front, NestJS en el backend y PostgreSQL. Web responsive, sin app nativa.

[16:23] Gustavo Peralta: Me parece bien. Nosotros no vamos a mantener el código en el corto plazo, así que lo que ustedes recomienden.

[16:31] Dra. Mariana Ferraro: ¿Y app para el celular?

[16:35] Martín Ríos: Recomendamos arrancar con web responsive bien optimizada para mobile. Una app nativa sería otro proyecto.

[16:43] Dra. Mariana Ferraro: Ok, de acuerdo.

[18:02] Lucía Benítez: Hablemos de plazos. En el brief hablan de dos meses.

[18:07] Dra. Mariana Ferraro: Sí, queremos salir antes de junio, que arranca la temporada de invierno.

[18:14] Lucía Benítez: Con un equipo chico, UX, front, back, QA y yo como PM, estimamos que entra en ese rango. Lo vamos a confirmar en la propuesta.

[18:24] Gustavo Peralta: ¿Van a dejar algún margen por imprevistos?

[18:28] Lucía Benítez: Lo vamos a evaluar. Como el alcance quedó bastante claro, la idea es ajustar lo más posible para entrar en el plazo.

[18:37] Gustavo Peralta: Bien.

[20:15] Martín Ríos: Un tema más de la agenda. Feriados: ¿se bloquean todas las sedes igual?

[20:21] Dra. Mariana Ferraro: Los nacionales sí. Algunos municipales solo afectan a San Isidro. Pero eso es raro.

[20:28] Martín Ríos: Ok, lo resolvemos con una carga de días no laborables por sede desde el backoffice.

[22:40] Lucía Benítez: Para cerrar: próximos pasos. Nosotros mandamos la propuesta formal la semana que viene. Ustedes arrancan el trámite de WhatsApp Business y nos pasan el acceso a AWS.

[22:52] Gustavo Peralta: Perfecto. El trámite de Meta lo arranco el lunes.

[22:57] Dra. Mariana Ferraro: Y yo les consigo a las recepcionistas de Centro y Norte para que les muestren cómo trabajan hoy.

[23:05] Lucía Benítez: Excelente, eso nos sirve mucho para UX. Cualquier duda, por el grupo de mail.

[23:12] Martín Ríos: Gracias a todos.

> El resto de la grabación (23:15 a 45:02) corresponde a una sesión de preguntas sobre el sistema actual de escritorio y a la coordinación de la visita a las sedes; no se transcribió por no contener definiciones de alcance.
