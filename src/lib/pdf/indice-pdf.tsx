import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { IndiceNotarial } from '@/types'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: '20mm 15mm',
    color: '#111',
  },
  header: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
  },
  escribania: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  subtitulo: {
    fontSize: 9,
    color: '#555',
    marginBottom: 2,
  },
  titulo: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  colNum: { width: '7%', fontFamily: 'Helvetica-Bold' },
  colFolio: { width: '8%' },
  colFecha: { width: '10%' },
  colTipo: { width: '18%' },
  colPartes: { width: '32%' },
  colInmueble: { width: '17%' },
  colObs: { width: '8%' },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#333' },
  tdText: { fontSize: 7, color: '#222' },
  footer: {
    position: 'absolute',
    bottom: '12mm',
    left: '15mm',
    right: '15mm',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#ccc',
    paddingTop: 4,
  },
  footerText: { fontSize: 6, color: '#888' },
  pageNumber: { fontSize: 6, color: '#888' },
})

interface Props {
  entradas: IndiceNotarial[]
  anio: number
  config: Record<string, string>
}

export function IndicePDF({ entradas, anio, config }: Props) {
  const nombre = config.nombre_escribania ?? 'Escribanía'
  const direccion = config.direccion_escribania ?? ''
  const matricula = config.matricula_escribano ?? ''
  const now = new Date().toLocaleDateString('es-AR')

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.escribania}>{nombre}</Text>
          {direccion ? <Text style={styles.subtitulo}>{direccion}</Text> : null}
          {matricula ? <Text style={styles.subtitulo}>Matrícula: {matricula}</Text> : null}
        </View>

        <Text style={styles.titulo}>Índice Notarial — Año {anio}</Text>

        {/* Tabla */}
        <View style={styles.table}>
          {/* Encabezado */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colNum, styles.thText]}>Nº Esc.</Text>
            <Text style={[styles.colFolio, styles.thText]}>Folio</Text>
            <Text style={[styles.colFecha, styles.thText]}>Fecha</Text>
            <Text style={[styles.colTipo, styles.thText]}>Tipo de acto</Text>
            <Text style={[styles.colPartes, styles.thText]}>Partes intervinientes</Text>
            <Text style={[styles.colInmueble, styles.thText]}>Inmueble</Text>
            <Text style={[styles.colObs, styles.thText]}>Obs.</Text>
          </View>

          {/* Filas */}
          {entradas.map((e, idx) => (
            <View
              key={e.id}
              style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={[styles.colNum, styles.tdText]}>{e.numero_escritura}</Text>
              <Text style={[styles.colFolio, styles.tdText]}>{e.folio ?? ''}</Text>
              <Text style={[styles.colFecha, styles.tdText]}>
                {new Date(e.fecha).toLocaleDateString('es-AR')}
              </Text>
              <Text style={[styles.colTipo, styles.tdText]}>{e.tipo_acto}</Text>
              <Text style={[styles.colPartes, styles.tdText]}>{e.partes}</Text>
              <Text style={[styles.colInmueble, styles.tdText]}>{e.inmueble ?? ''}</Text>
              <Text style={[styles.colObs, styles.tdText]}>{e.observaciones ?? ''}</Text>
            </View>
          ))}
        </View>

        {/* Pie de página */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generado el {now} · {nombre}
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
