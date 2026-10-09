# Brief — Sistema de turnos online

**Organización:** Red de Clínicas Del Valle
**Documento:** Brief inicial para proveedores de desarrollo de software
**Fecha:** marzo de 2024
**Elaborado por:** Gerencia de Sistemas y Dirección Médica

---

## 1. Quiénes somos

Red de Clínicas Del Valle es una red privada de atención ambulatoria con **4 sedes** (Centro, Norte, Barrio Parque y San Isidro) y alrededor de **60 profesionales** entre médicos clínicos, pediatras, ginecólogos, traumatólogos, cardiólogos y kinesiólogos. Atendemos pacientes particulares y afiliados a las principales obras sociales y prepagas.

## 2. El problema

Hoy los turnos se dan **casi exclusivamente por teléfono**. Cada sede tiene su propia línea y una o dos recepcionistas que, además de atender el teléfono, reciben a los pacientes en el mostrador. Esto nos genera varios problemas:

- **Líneas saturadas** entre las 8 y las 11 de la mañana. Muchos pacientes nos dicen que llamaron varias veces sin que los atiendan.
- **Agendas en planillas y en un sistema de escritorio viejo** que no comparte información entre sedes. Si un paciente quiere un turno con el cardiólogo "en la sede que sea", la recepcionista tiene que llamar a las otras sedes.
- **Ausentismo alto:** estimamos que alrededor del **22 %** de los turnos dados no se cumplen y el paciente no avisa. Son horas de profesional que perdemos y que otro paciente podría haber usado.
- **Poca información para decidir:** no sabemos con precisión qué especialidades están saturadas, qué sedes tienen capacidad ociosa ni qué pacientes faltan de manera reiterada.

## 3. Qué queremos lograr

1. Que el paciente pueda **sacar, cancelar y cambiar su turno por internet**, desde el celular o la computadora, sin tener que llamar.
2. **Bajar el ausentismo** a menos del 12 % en los primeros seis meses de uso.
3. Liberar a las recepcionistas de buena parte de las llamadas para que se concentren en la atención presencial.
4. Tener **una única agenda compartida** entre las 4 sedes.
5. Contar con **indicadores** de ocupación y ausentismo por sede y por profesional.

## 4. Lo que imaginamos que el sistema debería hacer

Lo describimos como lo vemos nosotros; seguramente ustedes lo van a ordenar mejor.

- El paciente se registra con su email (o con su cuenta de Google, si es posible), completa sus datos y su obra social o prepaga.
- Busca turno por **especialidad, por profesional o por sede**, ve los horarios libres y elige uno.
- Recibe una **confirmación** del turno y un **recordatorio el día anterior**. Nos interesa mucho que el recordatorio llegue **por WhatsApp**, porque es lo que la gente realmente lee. El email también está bien como respaldo.
- Desde el recordatorio, idealmente, el paciente debería poder **confirmar o avisar que no viene**, así liberamos el horario.
- Los profesionales tienen que poder ver su agenda del día y de la semana.
- Las recepcionistas tienen que poder dar turnos "a mano" para los pacientes que siguen llamando o que vienen al mostrador (sobre todo personas mayores).
- Necesitamos poder cargar y mantener los profesionales, las especialidades, las sedes, los horarios de atención de cada uno y las coberturas que aceptamos.
- De cada paciente nos gustaría ver sus datos, su cobertura y su historial de turnos, incluyendo si asistió o no.
- La Dirección necesita un tablero simple con ocupación de agendas y ausentismo, y poder bajar la información a Excel.

## 5. Restricciones y condiciones

- **Plazo deseado:** nos gustaría tener el sistema funcionando en **aproximadamente dos meses** desde el inicio. El objetivo es lanzarlo antes del invierno, que es nuestra temporada de mayor demanda.
- **Presupuesto:** todavía **no está definido**. Queremos recibir una propuesta con el detalle del esfuerzo para poder evaluarla internamente.
- **Infraestructura:** ya tenemos una **cuenta de AWS** que usa nuestro equipo de sistemas para el sitio institucional. Preferimos que la solución quede alojada ahí.
- **Dispositivos:** la mayoría de nuestros pacientes usa el celular. No necesitamos necesariamente una app para descargar, pero sí que la web funcione muy bien en el teléfono.
- **Datos sensibles:** manejamos datos personales y de salud, por lo que esperamos buenas prácticas de seguridad y resguardo.
- No queremos, por ahora, reemplazar el sistema de historia clínica que usan los médicos.

## 6. Qué esperamos recibir

- Una propuesta con el alcance, el equipo, el esfuerzo estimado y el plazo.
- Los supuestos sobre los que se basa la estimación.
- Una reunión inicial para profundizar en el funcionamiento de las agendas.

## 7. Contacto

- **Dra. Mariana Ferraro** — Directora Médica — mferraro@clinicasdelvalle.example
- **Gustavo Peralta** — Jefe de Sistemas — gperalta@clinicasdelvalle.example — (011) 4555-0192
