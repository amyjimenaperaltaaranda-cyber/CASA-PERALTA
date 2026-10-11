
/* Diccionario para reconocer productos por su nombre y proponer tipo y lugar.
   Solo se usa al ingresar a mano; lo que no reconoce se resuelve eligiendo el tipo. */

type Entry = { words: string[]; typeId: string; shelfId?: string }

const E = (typeId: string, words: string, shelfId?: string): Entry => ({ typeId, shelfId, words: words.split(',').map((word) => word.trim()) })

const ENTRIES: Entry[] = [
  // Frescos: pescados, mariscos, carnes frescas, verduras
  E('fresco', 'pescado,filete,trucha,lenguado,corvina,salmon,bonito,pejerrey,jurel,caballa,camaron,langostino,pulpo,calamar,pota,conchas,choros,mariscos,ceviche,pollo fresco,carne,bistec,chuleta,costilla,cordero,pavo,higado,bofe,jamon,chorizo,tocino,longaniza,salchicha,hot dog,hotdog,embutido,huevo de codorniz'),
  E('fresco', 'espinaca,apio,culantro,perejil,albahaca,lechuga,acelga,brocoli,coliflor,repollo,col,cebolla china,hierbabuena,huacatay,rabanito', 'verdes'),
  E('fresco', 'beterraga,betarraga,zanahoria,tomate,pimiento,pepino,vainita,zapallo,zapallito,camote,choclo,ajo,jengibre,kion,berenjena,rocoto,aji fresco', 'rojas'),
  // Congelados
  E('congelado', 'helado,paleta,pizza,nuggets,hamburguesa,papas fritas,verduras congeladas,hielo,masa congelada,empanada,pescado congelado,pollo congelado'),
  // Frascos de dos fases
  E('frasco', 'mermelada,membrillo,miel,manjar blanco,manjar,dulce de leche,mantequilla de mani,nutella,crema de avellana,aceitunas,pepinillos,encurtido,conserva,alcaparras,palmito,champinones en lata,chimichurri,aderezo,salsa de soya,sillao,tari,vinagre,salsa inglesa,pasta de tomate,puré de tomate,mayonesa de frasco', 'latas'),
  E('frasco', 'mostaza,ketchup,catsup,mayonesa,salsa,aji amarillo,pasta de aji,salsa de tomate,barbacoa,tartara,tabasco,sriracha,crema de rocoto', 'otros-fridge'),
  // Secos
  E('seco', 'arroz,fideo,fideos,tallarin,harina,azucar,sal,quinua,quinoa,avena,lenteja,frejol,garbanzo,arveja seca,cereal,granola,galleta,galletas,cafe,te,cacao,maicena,polvo de hornear,levadura,pan molido,canela,comino,pimienta,oregano,trigo,cebada,machica,chocolate en polvo,gelatina,mote,chuño,papa seca,pasas,nueces,almendras,mani'),
  // Lácteos y bebidas
  E('lacteo', 'leche,yogur,yogurt,queso,mantequilla,crema de leche,nata,kefir,requeson,evaporada,condensada,jugo,gaseosa,agua,chicha,refresco,cerveza,vino,bebida', 'otros-fridge'),
  // Líquidos de uso
  E('liquido', 'shampoo,champu,acondicionador,enjuague,crema corporal,locion', 'shampoos'),
  E('liquido', 'jabon liquido,jabon de manos', 'jabon-manos'),
  E('liquido', 'lavavajillas,lavaplatos', 'lavavajillas'),
  E('liquido', 'detergente,suavizante,lejia,cloro,desinfectante,limpiavidrios,limpiador,desengrasante,ambientador,jabon', 'liquidos'),
  // Duraderos
  E('duradero', 'esponja,cepillo,pano,paño,guantes,trapeador,escoba,recogedor,bolsa de basura,bolsas de basura,papel toalla,servilleta,servilletas,vela,velas,pilas,pila,foco,focos,fosforos,encendedor,rollo,toalla,toallas,sabana,sabanas'),
  // Medicinas
  E('medicina', 'paracetamol,ibuprofeno,pastilla,pastillas,jarabe,curita,curitas,alcohol,gasa,vendas,venda,antiseptico,vitamina,vitaminas,panadol,aspirina,antibiotico,termometro,suero,crema para heridas,suero oral', 'otros-firstaid'),
  // Fruta
  E('fruta', 'mango,fresa,fresas,uva,uvas,pina,papaya,mandarina,limon,durazno,sandia,melon,kiwi,platano de seda,arandanos,cereza,cerezas,granadilla,maracuya,chirimoya,lucuma,tuna,higo,ciruela,pomelo,toronja,guayaba,coco', 'frutero'),
]

const strip = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')
const singular = (word: string) => (word.length > 4 && word.endsWith('es') ? word.slice(0, -2) : word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word)

export type Recognized = { typeId: string; shelfId?: string; matched: string }

/** Busca el nombre en el diccionario: primero frases completas, luego palabra por palabra. */
export function recognize(name: string): Recognized | null {
  const text = strip(name)
  if (text.length < 2) return null
  const words = text.split(' ').map(singular)
  const candidates: { entry: Entry; word: string; score: number }[] = []
  for (const entry of ENTRIES) {
    for (const raw of entry.words) {
      const word = strip(raw)
      const wordSingular = word.split(' ').map(singular).join(' ')
      let score = 0
      if (text === word || text.split(' ').map(singular).join(' ') === wordSingular) score = 3 + word.length / 100
      else if (word.includes(' ') && text.includes(word)) score = 2 + word.length / 100
      else if (!word.includes(' ') && words.includes(singular(word))) score = 1 + word.length / 100
      if (score) candidates.push({ entry, word: raw, score })
    }
  }
  if (candidates.length === 0) return null
  const best = candidates.sort((a, b) => b.score - a.score)[0]
  return { typeId: best.entry.typeId, shelfId: best.entry.shelfId, matched: best.word }
}

/** Lugar por defecto de cada tipo cuando el diccionario no da uno. */
export const DEFAULT_SHELF: Record<string, string> = {
  fresco: 'otros-fridge',
  congelado: 'otros-freezer',
  frasco: 'latas',
  seco: 'otros-pantry',
  lacteo: 'otros-fridge',
  liquido: 'otros-cleaning',
  duradero: 'otros-cleaning',
  medicina: 'otros-firstaid',
  fruta: 'frutero',
}

export const nameCase = (name: string) => {
  const clean = name.trim().replace(/\s+/g, ' ')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

