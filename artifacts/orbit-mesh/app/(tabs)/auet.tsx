import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

const NODES = [
  { id: 'A', x: 80,  y: 60,  tdoa: 0,  signal: 92 },
  { id: 'B', x: 220, y: 50,  tdoa: 12, signal: 78 },
  { id: 'C', x: 290, y: 160, tdoa: 31, signal: 65 },
  { id: 'D', x: 60,  y: 180, tdoa: 44, signal: 81 },
];
const TARGET = { x: 165, y: 130 };

export default function AUETScreen() {
  const [state, setState] = useState<'idle'|'scanning'|'located'|'sent'>('idle');

  function start() {
    setState('scanning');
    setTimeout(() => setState('located'), 2500);
    setTimeout(() => setState('sent'), 5000);
  }

  return (
    <ScrollView style={{ flex:1, backgroundColor:'#0a0e1a' }} contentContainerStyle={{ padding:16, paddingBottom:120 }}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <Text style={{ color:'#fff', fontSize:18, fontWeight:'600' }}>AUET — Enkaz Konum Tespiti</Text>
        <View style={{ backgroundColor:'#1a2a1a', paddingHorizontal:10, paddingVertical:4, borderRadius:12 }}>
          <Text style={{ color: state==='idle' ? '#ff9500' : '#00ff88', fontSize:11, fontWeight:'600' }}>
            {state==='idle' ? 'Demo Modu' : 'Aktif'}
          </Text>
        </View>
      </View>

      <View style={{ backgroundColor:'#111827', borderRadius:16, padding:12, marginBottom:16 }}>
        <Text style={{ color:'#8899aa', fontSize:12, marginBottom:8 }}>Akustik Üçgenleme Haritası</Text>
        <Svg width="100%" height={250} viewBox="0 0 340 240">
          {[0,1,2,3].map(i=><Line key={`h${i}`} x1="0" y1={i*60} x2="340" y2={i*60} stroke="#1a2a3a" strokeWidth="0.5"/>)}
          {[0,1,2,3,4].map(i=><Line key={`v${i}`} x1={i*85} y1="0" x2={i*85} y2="240" stroke="#1a2a3a" strokeWidth="0.5"/>)}
          {state!=='idle' && NODES.map(n=><Line key={`l${n.id}`} x1={n.x} y1={n.y} x2={TARGET.x} y2={TARGET.y} stroke="#00d4ff" strokeWidth="0.8" strokeDasharray="4,4" opacity="0.5"/>)}
          {NODES.map(n=>(
            <View key={n.id}>
              <Circle cx={n.x} cy={n.y} r={14} fill="#0a1a2a" stroke="#00d4ff" strokeWidth="1.5"/>
              <SvgText x={n.x} y={n.y+5} textAnchor="middle" fill="#00d4ff" fontSize="12" fontWeight="bold">{n.id}</SvgText>
              <SvgText x={n.x} y={n.y+24} textAnchor="middle" fill="#556677" fontSize="9">+{n.tdoa}ms</SvgText>
            </View>
          ))}
          {(state==='located'||state==='sent') && <>
            <Circle cx={TARGET.x} cy={TARGET.y} r={20} fill="#ff3b5c" opacity="0.12"/>
            <Circle cx={TARGET.x} cy={TARGET.y} r={10} fill="#ff3b5c" opacity="0.3"/>
            <Circle cx={TARGET.x} cy={TARGET.y} r={5} fill="#ff3b5c"/>
            <SvgText x={TARGET.x} y={TARGET.y+30} textAnchor="middle" fill="#ff3b5c" fontSize="10" fontWeight="bold">37.8234°K, 32.4821°D</SvgText>
          </>}
          {state==='scanning' && <Circle cx={TARGET.x} cy={TARGET.y} r={8} fill="#ff9500" opacity="0.7"/>}
        </Svg>
        {(state==='located'||state==='sent') && (
          <View style={{ backgroundColor:'#0a1f0a', borderRadius:8, padding:10, marginTop:8 }}>
            <Text style={{ color:'#00ff88', fontSize:12, fontWeight:'600' }}>± 2.3 metre hassasiyet</Text>
            <Text style={{ color:'#556677', fontSize:11, marginTop:2 }}>37.8234°K, 32.4821°D</Text>
          </View>
        )}
      </View>

      <View style={{ backgroundColor:'#111827', borderRadius:16, padding:16, marginBottom:16 }}>
        <Text style={{ color:'#8899aa', fontSize:12, marginBottom:12 }}>TDOA Hesaplamaları</Text>
        {NODES.map(n=>(
          <View key={n.id} style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
            <View style={{ width:28, height:28, borderRadius:14, backgroundColor:'#0a1a2a', borderWidth:1.5, borderColor:'#00d4ff', alignItems:'center', justifyContent:'center', marginRight:12 }}>
              <Text style={{ color:'#00d4ff', fontSize:12, fontWeight:'700' }}>{n.id}</Text>
            </View>
            <Text style={{ color:'#fff', fontSize:13, width:70 }}>+{n.tdoa} ms</Text>
            <View style={{ flex:1, height:4, backgroundColor:'#1a2a3a', borderRadius:2 }}>
              <View style={{ width:`${n.signal}%`, height:4, backgroundColor:'#00d4ff', borderRadius:2 }}/>
            </View>
            <Text style={{ color:'#556677', fontSize:11, marginLeft:8 }}>{n.signal}%</Text>
          </View>
        ))}
      </View>

      <View style={{ backgroundColor:'#111827', borderRadius:16, padding:16, marginBottom:16 }}>
        <Text style={{ color:'#8899aa', fontSize:12, marginBottom:12 }}>İşlem Adımları</Text>
        {[
          {label:'Deprem tespit', done: state!=='idle'},
          {label:'Enkaz modu aktif', done: state!=='idle'},
          {label:'Akustik darbe yayıldı', done: state==='located'||state==='sent'},
          {label:'TDOA hesaplandı', done: state==='located'||state==='sent'},
          {label:'Konum belirlendi', done: state==='sent'},
          {label:"112'ye iletildi", done: state==='sent'},
        ].map((s,i)=>(
          <View key={i} style={{ flexDirection:'row', alignItems:'center', marginBottom:8 }}>
            <View style={{ width:22, height:22, borderRadius:11, backgroundColor: s.done?'#00ff88':'#1a2a3a', alignItems:'center', justifyContent:'center', marginRight:10 }}>
              <Text style={{ color: s.done?'#0a1a0a':'#556677', fontSize:11 }}>{s.done?'✓':i+1}</Text>
            </View>
            <Text style={{ color: s.done?'#00ff88':'#556677', fontSize:13 }}>{s.label}</Text>
          </View>
        ))}
      </View>

      {state==='idle' && (
        <TouchableOpacity onPress={start} style={{ backgroundColor:'#ff3b5c', borderRadius:12, padding:16, alignItems:'center', marginBottom:16 }}>
          <Text style={{ color:'#fff', fontSize:15, fontWeight:'700' }}>🚨 Enkaz Simülasyonu Başlat</Text>
        </TouchableOpacity>
      )}
      {state==='sent' && (
        <View style={{ backgroundColor:'#0a1f0a', borderRadius:12, padding:16, alignItems:'center', marginBottom:16, borderWidth:1, borderColor:'#00ff88' }}>
          <Text style={{ color:'#00ff88', fontSize:16, fontWeight:'700' }}>✅ Koordinat 112'ye İletildi</Text>
          <Text style={{ color:'#556677', fontSize:12, marginTop:4 }}>37.8234°K, 32.4821°D · ±2.3m</Text>
        </View>
      )}
    </ScrollView>
  );
}
