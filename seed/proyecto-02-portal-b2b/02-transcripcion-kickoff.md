# Transcripción — Reunión de kickoff: Portal B2B Mayorista

**Proyecto:** Portal B2B Mayorista (Distribuidora Andina S.A.)
**Fecha:** 6 de marzo de 2025
**Formato:** videollamada grabada
**Duración:** 50 minutos aprox.

**Participantes:**
- Ricardo Sosa — Gerente Comercial (cliente)
- Paula Méndez — Responsable de Sistemas (cliente)
- Lucía Benítez — Project Manager (equipo)
- Martín Ríos — Tech Lead (equipo)

> Transcripción automática revisada. Se omitieron saludos y cortes de audio.

---

[00:00] Lucía Benítez: Bueno, arrancamos. Gracias por el tiempo. La idea de hoy es repasar el brief que nos mandaron, sacarnos dudas y llevarnos lo necesario para armar la propuesta formal. Somos Martín, que va a ser el tech lead, y yo, que voy a llevar el proyecto.
[01:19] Ricardo Sosa: Perfecto. Yo soy Ricardo, gerente comercial, y está Paula, que es la responsable de sistemas. Ella es la que sabe todo lo del ERP.
[01:51] Paula Méndez: Hola. Bueno, "todo" es mucho decir, ya van a ver.
[02:09] Lucía Benítez: Ricardo, si querés contanos en dos minutos cómo funciona hoy un pedido, de punta a punta.
[02:31] Ricardo Sosa: Hoy el comercio llama, manda un WhatsApp o se lo dice al vendedor cuando pasa. El vendedor anota en una planilla o en el celular, y después la oficina lo carga en el ERP. Tenemos unos 1.200 clientes activos y 25 vendedores. En temporada alta la oficina no da abasto.
[03:54] Martín Ríos: ¿Y cuántos pedidos por día manejan, más o menos?
[04:08] Ricardo Sosa: En temporada normal, entre 250 y 300 pedidos por día. En temporada alta, bastante más.
[04:33] Lucía Benítez: Bien. Vamos por partes. Empecemos por los usuarios. En el brief dicen que en un comercio puede comprar más de una persona.
[05:02] Ricardo Sosa: Sí. Típicamente el dueño y un encargado. El dueño quiere ver todo, incluyendo la cuenta corriente; el encargado a veces solo arma el pedido.
[05:34] Martín Ríos: Entonces tendríamos un usuario administrador de la cuenta del comercio, que puede invitar a otros, y usuarios compradores. Además los vendedores de ustedes y los administradores internos.
[06:14] Ricardo Sosa: Exacto. Y el vendedor tiene que ver solo sus clientes, no los de los demás.
[06:32] Martín Ríos: Perfecto. Eso, roles y permisos más invitación por mail. Lo que es autenticación y backoffice lo tenemos bastante resuelto de un proyecto anterior, un sistema de turnos para una red de clínicas, del sector salud. Ahí hicimos login, roles y un backoffice administrativo bastante completo. Lo nuevo acá es el multiusuario por empresa.
[07:55] Lucía Benítez: Sí, vamos a usar ese proyecto como referencia para estimar esa parte. Nos dio bastante bien.
[08:16] Ricardo Sosa: Buenísimo.
[08:24] Lucía Benítez: Pasemos al catálogo. ¿Cuántos productos son?
[08:34] Ricardo Sosa: Unos 8.000 artículos activos.
[08:45] Martín Ríos: ¿Y cada cliente ve un precio distinto?
[08:56] Ricardo Sosa: Sí, esa es la parte delicada. Tenemos varias listas de precios, y además descuentos particulares por cliente. Un autoservicio grande no paga lo mismo que un kiosco.
[09:36] Paula Méndez: Las listas y los descuentos están en el ERP. Cada cliente tiene asignada una lista y, si tiene, un descuento por rubro o por artículo.
[10:12] Martín Ríos: Bien. Entonces el precio final lo calculamos nosotros a partir de lo que venga del ERP, o el ERP nos devuelve el precio ya calculado por cliente?
[10:40] Paula Méndez: Creo que hay un servicio que te devuelve el precio por cliente, pero no estoy segura de si incluye los descuentos por rubro. Lo tengo que revisar.
[11:13] Lucía Benítez: Lo anoto como pendiente. Paula, ¿nos confirmás eso?
[11:24] Paula Méndez: Sí, sí.
[11:31] Martín Ríos: Y el stock, ¿por depósito?
[11:38] Ricardo Sosa: Tenemos dos depósitos. Al cliente le alcanza con ver si hay o no hay, pero internamente sí nos interesa saber de qué depósito sale.
[12:10] Martín Ríos: Ok. Mostramos disponibilidad por depósito. Para la búsqueda, con 8.000 SKUs, una búsqueda de texto con filtros por marca y categoría debería andar bien sin meter un motor externo.
[12:54] Lucía Benítez: Vamos al carrito. ¿Qué reglas tienen para los pedidos?
[13:08] Ricardo Sosa: La principal es el pedido mínimo. Cada cliente tiene un monto mínimo, depende de la zona y del tipo de cliente. Si no llega, no se lo despachamos.
[13:44] Martín Ríos: ¿El mínimo lo define el ERP o lo definen ustedes comercialmente?
[13:58] Ricardo Sosa: Hoy lo manejamos en una planilla, la verdad. Nos gustaría poder configurarlo desde el portal.
[14:20] Martín Ríos: Perfecto, entonces va como parámetro comercial en el backoffice, junto con las zonas de entrega.
[14:42] Ricardo Sosa: Otra cosa muy importante: repetir pedido. El 80 % de los clientes compra casi lo mismo todas las semanas.
[15:07] Lucía Benítez: Anotado: repetir pedido anterior, carrito persistente, y elegir fecha de entrega.
[15:28] Ricardo Sosa: La fecha de entrega depende de la zona. Cada zona tiene días de reparto.
[15:46] Martín Ríos: Bien, lo cruzamos con las zonas configuradas. La logística en sí, el ruteo de camiones, eso queda afuera, ¿no?
[16:12] Ricardo Sosa: Sí, eso lo seguimos haciendo como hoy.
[16:22] Lucía Benítez: Hablemos de pagos.
[16:30] Ricardo Sosa: La gran mayoría compra en cuenta corriente. Pero hay clientes nuevos o chicos que no tienen cuenta y pagan por adelantado. Hoy hacen transferencia y mandan el comprobante por WhatsApp, que es un lío.
[17:16] Martín Ríos: Para eso proponemos integrar una pasarela de pagos, con tarjeta y transferencia. ¿Tienen alguna preferida?
[17:38] Ricardo Sosa: Ya tenemos cuenta en una pasarela que usamos para otra cosa. Paula les pasa los datos.
[17:56] Martín Ríos: Genial. Si tiene SDK y sandbox documentados, eso suele ser tranquilo.
[18:14] Paula Méndez: Sí, esa tiene todo bien documentado, la usamos hace un año.
[18:28] Ricardo Sosa: Y lo de la cuenta corriente: que el cliente pueda ver su saldo y descargar sus comprobantes. Eso nos sacaría la mitad de las llamadas.
[18:57] Martín Ríos: El saldo y los comprobantes salen del ERP, me imagino.
[19:08] Paula Méndez: Sí, del ERP.
[19:15] Lucía Benítez: Bueno, eso nos lleva al tema grande: el ERP. Paula, contanos.
[19:33] Paula Méndez: Es un ERP que tenemos hace como quince años. Está muy customizado. Expone servicios SOAP para consultar artículos, precios, stock, saldo de cuenta corriente y para dar de alta pedidos.
[20:24] Martín Ríos: ¿Tienen documentación de esos servicios? WSDL, ejemplos de request y response, códigos de error?
[20:45] Paula Méndez: La documentación la tenemos... en algún lado. La hizo un proveedor que ya no trabaja con nosotros. Hay un PDF y algunos WSDL. No sé si están actualizados con las últimas customizaciones.
[21:28] Martín Ríos: Ok. ¿Y un ambiente de testing donde podamos pegarle sin tocar producción?
[21:46] Paula Méndez: Lo estamos armando. Hoy hay un ambiente de pruebas, pero está desactualizado y lo usamos para otra cosa. La idea es tener uno limpio para ustedes.
[22:22] Martín Ríos: ¿Para cuándo lo calculan?
[22:30] Paula Méndez: Y... dos, tres semanas. Depende de infraestructura.
[22:48] Lucía Benítez: Eso para nosotros es crítico. Lo vamos a poner como supuesto en la propuesta: acceso al ambiente de testing del ERP al inicio del proyecto.
[23:20] Ricardo Sosa: Entendido. Paula, ¿llegamos?
[23:31] Paula Méndez: Vamos a hacer lo posible.
[23:42] Martín Ríos: Otra pregunta. Los códigos de producto: ¿son los mismos en todos lados? Lo pregunto porque a veces el código que ve el vendedor no es el mismo que el interno del ERP.
[24:18] Paula Méndez: Mmm. En general sí. Hay algunos artículos viejos que tienen código interno y código comercial distinto, y algunos que se dieron de alta dos veces. Pero son pocos, creo.
[24:57] Martín Ríos: ¿Cuántos son "pocos"?
[25:04] Paula Méndez: No sabría decirte. Puedo sacar un listado.
[25:15] Martín Ríos: Sí, por favor. Si son muchos, vamos a necesitar una tabla de mapeo de códigos entre el portal y el ERP.
[25:40] Lucía Benítez: Lo anoto también como pendiente.
[25:51] Martín Ríos: Sobre la frecuencia de sincronización: ¿qué tan actualizado tiene que estar el stock y el precio en el portal?
[26:16] Ricardo Sosa: Lo ideal sería en tiempo real.
[26:24] Paula Méndez: Tiempo real no, por favor. El ERP no aguanta muchas consultas. Ya tuvimos problemas cuando conectamos otra cosa.
[26:49] Martín Ríos: Lo que proponemos es una sincronización periódica: productos, precios y stock cada 15 minutos, y los pedidos confirmados se envían al ERP en el momento, con reintentos si falla.
[27:32] Ricardo Sosa: ¿Cada 15 minutos alcanza?
[27:39] Martín Ríos: Para stock de consumo masivo, en general sí. Si un producto se agota entre una sincronización y otra, el pedido entra igual y la oficina lo resuelve como hoy.
[28:12] Ricardo Sosa: Ok, me cierra.
[28:19] Paula Méndez: A mí también, es mucho más razonable para el ERP.
[28:33] Martín Ríos: Y vamos a poner monitoreo y alertas sobre la sincronización, para enterarnos si se cae antes que ustedes.
[28:55] Lucía Benítez: Martín, ¿algo más del ERP?
[29:02] Martín Ríos: Les adelanto que esta es la parte de más riesgo del proyecto. Servicios SOAP legacy, documentación dudosa y ambiente de testing que todavía no existe. En el proyecto de turnos tuvimos una integración con un tercero que se nos fue bastante de lo estimado, así que acá vamos a ser prudentes.
[30:07] Ricardo Sosa: Entiendo. ¿Eso cómo impacta en el plazo?
[30:18] Lucía Benítez: Vamos a incluir una contingencia en la estimación justamente para cubrir este tipo de desvíos. Y lo vamos a dejar explícito como riesgo.
[30:50] Ricardo Sosa: Bien. El plazo es lo que más me preocupa. Necesitamos estar online antes de mayo.
[31:12] Lucía Benítez: Con el equipo que tenemos en mente estamos pensando en algo cercano a siete semanas. Lo confirmamos en la propuesta.
[31:37] Ricardo Sosa: Si arrancan a fin de mes, llegamos justo.
[31:51] Lucía Benítez: Vamos a notificaciones. En el brief piden emails.
[32:06] Ricardo Sosa: Sí. Confirmación de pedido y cambio de estado. Y la invitación cuando el dueño suma a un empleado.
[32:31] Martín Ríos: ¿WhatsApp no?
[32:38] Ricardo Sosa: No, por ahora no. Con mail alcanza.
[32:49] Martín Ríos: Bien, eso lo simplifica mucho. En el proyecto anterior las notificaciones por WhatsApp nos dieron bastante trabajo; solo email es mucho más acotado.
[33:21] Lucía Benítez: Backoffice. Ricardo, ¿qué necesita la oficina comercial?
[33:36] Ricardo Sosa: Gestionar clientes y usuarios, ver los pedidos y cambiarles el estado, y poder poner banners y productos destacados. Por ejemplo, cuando un proveedor nos da una promo.
[34:15] Martín Ríos: Más los parámetros comerciales que hablamos: pedido mínimo y zonas de entrega.
[34:30] Ricardo Sosa: Exacto.
[34:37] Martín Ríos: Esto también lo apoyamos en lo que hicimos para el sistema de turnos. Tenemos componentes de backoffice que podemos reutilizar.
[35:02] Lucía Benítez: Y por último, reportes.
[35:13] Ricardo Sosa: Ventas por cliente, por vendedor y por categoría. Productos más pedidos. Y que se pueda exportar a Excel, porque la gerencia vive en Excel.
[35:45] Martín Ríos: ¿Los reportes son sobre lo que entra por el portal, o sobre todas las ventas, incluyendo lo que sigue entrando por teléfono?
[36:10] Ricardo Sosa: Con lo del portal está bien para empezar.
[36:21] Martín Ríos: Perfecto, eso lo hace mucho más simple que cruzar todo con el ERP.
[36:36] Ricardo Sosa: Capaz más adelante pedimos algún filtro más, eh.
[36:46] Lucía Benítez: Lo vemos en el momento. Lo que entre dentro de lo razonable lo absorbemos.
[37:04] Lucía Benítez: Temas de infraestructura. Martín, ¿qué proponés?
[37:15] Martín Ríos: Staging y producción en la nube, con pipelines de integración y despliegue continuo. Los pipelines los reutilizamos del proyecto anterior. Y lo que dije del monitoreo de la sincronización.
[37:58] Paula Méndez: ¿Tenemos que poner algo de nuestro lado?
[38:09] Martín Ríos: Solo la conectividad hacia los servicios SOAP del ERP. Puede ser VPN o una IP fija habilitada en su firewall.
[38:34] Paula Méndez: Ok, eso lo vemos con infraestructura.
[38:45] Lucía Benítez: Fuera de alcance, para dejarlo claro: app mobile nativa, logística y ruteo de entregas, facturación electrónica. ¿De acuerdo?
[39:14] Ricardo Sosa: De acuerdo. La facturación sigue saliendo del ERP.
[39:28] Lucía Benítez: Resumo pendientes del lado de ustedes: Paula confirma si el servicio de precios incluye descuentos por rubro, pasa la documentación y los WSDL, el listado de códigos de producto duplicados o con doble código, y la fecha del ambiente de testing. Ricardo nos pasa los datos de la pasarela.
[40:33] Paula Méndez: Anotado. La documentación la busco esta semana.
[40:48] Lucía Benítez: De nuestro lado: armamos la propuesta formal con estimación por módulo, equipo, duración, supuestos y riesgos. La tienen la semana que viene.
[41:20] Ricardo Sosa: Excelente. Muchas gracias.
[41:27] Martín Ríos: Gracias a ustedes.

---

> Nota: el resto de la grabación (min. 42 a 50) corresponde a una demo del sistema actual de carga de pedidos en el ERP y a un recorrido por las planillas de listas de precios y pedidos mínimos. Se resumen los puntos relevantes:

- El equipo administrativo carga hoy los pedidos con códigos internos del ERP; los vendedores usan el código comercial impreso en el catálogo en papel. En la demo aparecieron al menos tres artículos con códigos distintos según la fuente.
- La pantalla de alta de pedidos del ERP valida cliente, artículo y depósito, y rechaza pedidos con artículos dados de baja.
- Los pedidos mínimos se manejan en una planilla por zona y tipo de cliente; hay 6 zonas de entrega con días de reparto fijos.
- Paula Méndez mostró un PDF de documentación de los servicios SOAP de 2019; reconoció que "varios métodos cambiaron después".
