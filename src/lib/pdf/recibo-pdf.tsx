import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: '20mm', color: '#111' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 12 },
  escribania: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  subtitulo: { fontSize: 8, color: '#666' },
  titulo: { fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'center', marginBottom: 4 },
  subtituloDoc: { fontSize: 9, textAlign: 'center', color: '#555', marginBottom: 20 },
  seccion: { marginBottom: 16 },
  seccionTitulo: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, borderBottomWidth: 0.5, borderBottomColor: '#ddd', paddingBottom: 3 },
  fila: { flexDirection: 'row', marginBottom: 5 },
  label: { width: 160, fontSize: 9, color: '#555', fontFamily: 'Helvetica-Bold' },
  valor: { flex: 1, fontSize: 9, color: '#111' },
  firmaArea: { marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' },
  firmaBloque: { width: '45%', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 6 },
  firmaLabel: { fontSize: 8, color: '#555', textAlign: 'center' },
  footer: { position: 'absolute', bottom: '15mm', left: '20mm', right: '20mm', flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: '#ddd', paddingTop: 4 },
  footerText: { fontSize: 7, color: '#999' },
  recuadro: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 4, padding: 10, marginBottom: 16 },
})

export interface ReciboData {
  numeroEscritura?: number
  tipoActo: string
  clienteNombre: string
  clienteDNI?: string
  receptorNombre: string
  receptorDNI: string
  fechaEntrega: string
  observaciones?: string
  escribania: string
  direccionEscribania?: string
}

export function ReciboPDF({ data }: { data: ReciboData }) {
  const ahora = new Date().toLocaleDateString('es-AR')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabecera */}
        <View style={styles.header}>
          <View>
            <Text style={styles.escribania}>{data.escribania}</Text>
            {data.direccionEscribania ? <Text style={styles.subtitulo}>{data.direccionEscribania}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.subtitulo}>Fecha: {ahora}</Text>
          </View>
        </View>

        {/* Título */}
        <Text style={styles.titulo}>CONSTANCIA DE ENTREGA</Text>
        <Text style={styles.subtituloDoc}>Documento oficial de recepción de instrumentos notariales</Text>

        {/* Acto notarial */}
        <View style={styles.recuadro}>
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Acto notarial</Text>
            {data.numeroEscritura ? (
              <View style={styles.fila}>
                <Text style={styles.label}>Escritura Nº</Text>
                <Text style={styles.valor}>{data.numeroEscritura}</Text>
              </View>
            ) : null}
            <View style={styles.fila}>
              <Text style={styles.label}>Tipo de acto</Text>
              <Text style={styles.valor}>{data.tipoActo}</Text>
            </View>
            <View style={styles.fila}>
              <Text style={styles.label}>Cliente / Parte</Text>
              <Text style={styles.valor}>{data.clienteNombre}{data.clienteDNI ? ` · DNI ${data.clienteDNI}` : ''}</Text>
            </View>
          </View>
        </View>

        {/* Receptor */}
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Datos del receptor</Text>
          <View style={styles.fila}>
            <Text style={styles.label}>Recibido por</Text>
            <Text style={styles.valor}>{data.receptorNombre}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.label}>DNI del receptor</Text>
            <Text style={styles.valor}>{data.receptorDNI}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.label}>Fecha de entrega</Text>
            <Text style={styles.valor}>{data.fechaEntrega}</Text>
          </View>
          {data.observaciones ? (
            <View style={styles.fila}>
              <Text style={styles.label}>Observaciones</Text>
              <Text style={styles.valor}>{data.observaciones}</Text>
            </View>
          ) : null}
        </View>

        {/* Firmas */}
        <View style={styles.firmaArea}>
          <View style={styles.firmaBloque}>
            <Text style={styles.firmaLabel}>Firma del receptor</Text>
            <Text style={[styles.firmaLabel, { marginTop: 3 }]}>{data.receptorNombre}</Text>
            <Text style={[styles.firmaLabel, { marginTop: 1 }]}>DNI {data.receptorDNI}</Text>
          </View>
          <View style={styles.firmaBloque}>
            <Text style={styles.firmaLabel}>Sello y firma de la escribanía</Text>
            <Text style={[styles.firmaLabel, { marginTop: 3 }]}>{data.escribania}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.escribania} — Constancia de entrega</Text>
          <Text style={styles.footerText}>Generado el {ahora}</Text>
        </View>
      </Page>
    </Document>
  )
}
