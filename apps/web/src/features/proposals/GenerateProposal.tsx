import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../../components/Modal'

/** Generation lives at page level so its state survives tab switches. */
export interface Generation {
  isPending: boolean
  error: Error | null
  /** regenerations (versions already exist) bypass the LLM cache */
  run: (instructions?: string) => void
}

export function GenerateProposalButton({
  hasReadySources,
  isPending,
  isFirst,
  onGenerate,
}: {
  hasReadySources: boolean
  isPending: boolean
  isFirst: boolean
  onGenerate: (instructions?: string) => void
}) {
  const [asking, setAsking] = useState(false)
  const [instructions, setInstructions] = useState('')
  return (
    <>
      <button type="button" className="btn btn-primary" disabled={!hasReadySources || isPending} onClick={() => setAsking(true)}>
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        {isFirst ? 'Generar propuestas' : 'Nueva versión'}
      </button>
      {asking && (
        <Modal
          title="Generar propuestas"
          onClose={() => setAsking(false)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setAsking(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setAsking(false)
                  onGenerate(instructions.trim() || undefined)
                }}
              >
                <Sparkles size={15} /> Generar
              </button>
            </>
          }
        >
          <p className="text-[13.5px] text-text-soft">
            Se arma el catálogo de módulos a partir de las fuentes, calibrado con el histórico, y con él tres opciones para el cliente:{' '}
            <b>MVP</b>, <b>Equilibrada</b> (lo que entra en la fecha objetivo) y <b>Completa</b>. Las versiones anteriores se conservan.
          </p>
          {!isFirst && (
            <p className="text-[12.5px] text-text-faint">Se vuelve a consultar al modelo (gasta 1 pedido de la cuota diaria).</p>
          )}
          <label className="field">
            <span className="field-label">Indicaciones (opcional)</span>
            <textarea
              className="input min-h-[110px]"
              placeholder="Ej.: La fecha de salida es el 1 de marzo. La app mobile queda fuera. El equipo no puede tener más de 2 backend."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </label>
        </Modal>
      )}
    </>
  )
}

export function GeneratingBanner() {
  return (
    <div className="card flex items-center gap-3 p-4">
      <Loader2 size={20} className="animate-spin text-brand" />
      <div>
        <div className="font-bold text-text">Generando las propuestas…</div>
        <div className="text-[13px] text-text-soft">
          Leyendo las fuentes, calibrando con el histórico y armando MVP, Equilibrada y Completa. Con modelos free puede tardar 1–2 minutos.
        </div>
      </div>
    </div>
  )
}
