import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, Dimensions, Platform, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Card, Button, IconButton, useTheme, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const KATEGORILER = [
  {
    key: 'et',
    ad: 'Et Ürünleri',
    icon: 'food-steak' as const,
    malzemeler: [
      'Tavuk', 'Kırmızı Et', 'Balık', 'Sucuk', 'Köfte', 'Dana Eti', 'Kuzu Eti', 'Hindi', 'Biftek', 'Sosis',
      'Ciğer', 'Pastırma', 'Jambon', 'Salam', 'Bonfile', 'Piliç', 'Antrikot', 'Kavurma', 'Şinitzel', 'Köylü Sucuğu', 'Kuzu Pirzola'
    ],
    renkler: ['#8A2BE2', '#5A189A']
  },
  {
    key: 'baklagil',
    ad: 'Baklagil',
    icon: 'food-apple' as const,
    malzemeler: [
      'Mercimek', 'Nohut', 'Fasulye', 'Barbunya', 'Bezelye', 'Bakla', 'Soya Fasulyesi', 'Börülce', 'Kuru Fasulye', 'Yeşil Mercimek',
      'Kırmızı Mercimek', 'Maş Fasulyesi', 'Lupin', 'Acı Bakla', 'Kara Fasulye', 'Kestane', 'Leblebi', 'Fava', 'Humus', 'Filizlenmiş Nohut', 'Filizlenmiş Mercimek'
    ],
    renkler: ['#F59E0B', '#FFB703']
  },
  {
    key: 'sut',
    ad: 'Süt ve Süt Ürünleri',
    icon: 'cup-water' as const,
    malzemeler: [
      'Süt', 'Peynir', 'Yoğurt', 'Tereyağı', 'Kaşar', 'Labne', 'Krema', 'Beyaz Peynir', 'Çökelek', 'Ayran',
      'Mozzarella', 'Parmesan', 'Süzme Yoğurt', 'Kaymak', 'Lor', 'Gravyer', 'Hellim', 'Kefir', 'Mascarpone', 'Tulum Peyniri'
    ],
    renkler: ['#6EE7B7', '#3B82F6']
  },
  {
    key: 'sebze',
    ad: 'Sebze ve Meyve',
    icon: 'food-variant' as const,
    malzemeler: [
      'Domates', 'Patates', 'Elma', 'Ispanak', 'Salatalık', 'Biber', 'Soğan', 'Havuç', 'Kabak', 'Portakal',
      'Limon', 'Muz', 'Karpuz', 'Kavun', 'Çilek', 'Brokoli', 'Karnabahar', 'Pırasa', 'Marul', 'Roka'
    ],
    renkler: ['#4ADE80', '#16A34A']
  },
] as const;

type KategoriKey = typeof KATEGORILER[number]['key'];

// Gemini API key is now loaded from environment variables for security. See .env.example for instructions.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const USER_KEY = 'current_user';
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [seciliKategori, setSeciliKategori] = useState<KategoriKey>(KATEGORILER[0].key);
  const [seciliMalzemeler, setSeciliMalzemeler] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tarifler, setTarifler] = useState<string[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [favoriler, setFavoriler] = useState<string[]>([]);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        const u = await AsyncStorage.getItem(USER_KEY);
        if (u) {
          const userObj = JSON.parse(u);
          setUser(userObj);
          // Favorileri Firestore'dan çek
          const favRef = doc(db, 'favorites', userObj.email);
          const favSnap = await getDoc(favRef);
          if (favSnap.exists()) {
            setFavoriler(favSnap.data().items || []);
          } else {
            setFavoriler([]);
          }
        }
      } catch {}
    };
    loadUserAndFavorites();
  }, []);

  const kategoriSec = (key: KategoriKey) => setSeciliKategori(key);

  const malzemeSec = (malzeme: string) => {
    setSeciliMalzemeler(prev =>
      prev.includes(malzeme) ? prev.filter(m => m !== malzeme) : [...prev, malzeme]
    );
  };

  const seciliKategoriObj = KATEGORILER.find(k => k.key === seciliKategori);
  const seciliRenkler = seciliKategoriObj?.renkler || ['#8A2BE2', '#5A189A'];

  const tarifAra = async () => {
    setLoading(true);
    setTarifler([]);
    setHata(null);
    try {
      const prompt = `Aşağıdaki malzemelerle yapılabilecek 3 farklı yemek tarifi öner. Her tarifi şu şablonda ver: \n\nBaşlık: [Tarif Adı]\nMalzemeler: [Malzeme Listesi]\nYapılışı: [Kısa Açıklama]\n\nMalzemeler: ${seciliMalzemeler.join(', ')}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ]
          })
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const tariflerArr = text.split(/Başlık:/).filter(Boolean).map((t: string) => 'Başlık:' + t.trim());
      setTarifler(tariflerArr);
    } catch (err) {
      setHata('Tarifler alınırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const favoriyeEkle = async (tarif: string) => {
    if (!user) return;
    try {
      const favRef = doc(db, 'favorites', user.email);
      await setDoc(favRef, { items: arrayUnion(tarif) }, { merge: true });
      setFavoriler(prev => prev.includes(tarif) ? prev : [...prev, tarif]);
    } catch {}
  };

  const favoridenKaldir = async (tarif: string) => {
    if (!user) return;
    try {
      const favRef = doc(db, 'favorites', user.email);
      await updateDoc(favRef, { items: arrayRemove(tarif) });
      setFavoriler(prev => prev.filter(f => f !== tarif));
    } catch {}
  };

  const favoriMi = (tarif: string) => favoriler.includes(tarif);

  // Profil köşesi
  const goToProfile = () => router.replace('/(tabs)/profile');

  // FlatList numColumns'u dinamik ayarla
  const malzemeSayisi = seciliKategoriObj?.malzemeler.length || 1;
  const maxColumns = width < 400 ? 2 : width < 600 ? 3 : 5;
  const numColumns = Math.min(malzemeSayisi, maxColumns);

  return (
    <>
      <Stack.Screen options={{ title: 'MealMatch' }} />
      <LinearGradient colors={seciliRenkler as [string, string]} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Bugün ne yemek istersin?</Text>
          <View style={styles.kategoriBar}>
            {KATEGORILER.map(kat => (
              <Pressable
                key={kat.key}
                onPress={() => kategoriSec(kat.key)}
                style={({ pressed }) => [
                  styles.kategoriBtn,
                  seciliKategori === kat.key && styles.kategoriBtnSecili,
                  pressed && styles.kategoriBtnPressed,
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name={kat.icon} size={22} color={seciliKategori === kat.key ? '#8A2BE2' : '#fff'} style={{ marginRight: 4 }} />
                  <Text style={[styles.kategoriBtnText, seciliKategori === kat.key && styles.kategoriBtnTextSecili]}>{kat.ad}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Text style={styles.subtitle}>Malzeme Seç:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginBottom: 8 }}>
            {(seciliKategoriObj?.malzemeler || []).map(item => (
              <Pressable
                key={item}
                style={({ pressed }) => [
                  styles.malzemeCard,
                  seciliMalzemeler.includes(item) && styles.malzemeCardSecili,
                  pressed && styles.malzemeCardPressed,
                  { margin: 6, minWidth: 110, maxWidth: 150, flexGrow: 1, flexBasis: '30%' }
                ]}
                onPress={() => malzemeSec(item)}
              >
                <Text style={[styles.malzemeText, seciliMalzemeler.includes(item) && styles.malzemeTextSecili]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          {seciliMalzemeler.length > 0 && (
            <View style={styles.seciliMalzemelerContainer}>
              <Text style={styles.seciliMalzemelerTitle}>Seçilen Malzemeler:</Text>
              <View style={styles.seciliMalzemelerList}>
                {seciliMalzemeler.map(malzeme => (
                  <View key={malzeme} style={styles.seciliMalzemeChip}>
                    <Text style={styles.seciliMalzemeText}>{malzeme}</Text>
                    <Pressable onPress={() => setSeciliMalzemeler(prev => prev.filter(m => m !== malzeme))} style={{ marginLeft: 4 }}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => setSeciliMalzemeler([])} style={styles.seciliMalzemeleriTemizleBtn}>
                <Text style={styles.seciliMalzemeleriTemizleText}>Tümünü Temizle</Text>
              </Pressable>
            </View>
          )}
          {seciliMalzemeler.length > 0 && !loading && tarifler.length === 0 && (
            <Button mode="contained" onPress={tarifAra} style={styles.tarifAraBtn} labelStyle={{ fontWeight: 'bold', fontSize: 16 }}>Tarif Ara</Button>
          )}
          {loading && <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 16 }} />}
          {hata && <Text style={{ color: 'red', marginTop: 16 }}>{hata}</Text>}
          {tarifler.length > 0 && (
            <View style={styles.tariflerContainer}>
              {tarifler.map((tarif, idx) => (
                <Card key={idx} style={styles.tarifCard}>
                  <Card.Content>
                    <IconButton
                      icon={favoriMi(tarif) ? 'star' : 'star-outline'}
                      iconColor={favoriMi(tarif) ? '#FFD700' : '#bbb'}
                      size={28}
                      style={styles.favIcon}
                      onPress={() => favoriMi(tarif) ? favoridenKaldir(tarif) : favoriyeEkle(tarif)}
                    />
                    {tarif.split('\n').map((line, i) => (
                      line.startsWith('Başlık:') ? (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <MaterialCommunityIcons name="silverware-fork-knife" size={22} color="#8A2BE2" style={{ marginRight: 6 }} />
                          <Text style={styles.tarifBaslik}>{line.replace('Başlık:', '').trim()}</Text>
                        </View>
                      ) : (
                        <Text key={i} style={styles.tarifText}>{line}</Text>
                      )
                    ))}
                  </Card.Content>
                </Card>
              ))}
              <Button mode="outlined" onPress={() => { setTarifler([]); setSeciliMalzemeler([]); }} style={styles.yeniTarifBtn} labelStyle={{ fontWeight: 'bold', fontSize: 16, color: '#8A2BE2' }}>
                Yeni Tarif İçin Sıfırla
              </Button>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  gradientBg: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
  },
  container: {
    padding: 20,
    minHeight: width > 500 ? 600 : 400,
    backgroundColor: 'transparent',
    flexGrow: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 18,
    textAlign: 'center',
    color: '#fff',
    textShadowColor: '#0002',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  kategoriBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
    width: '100%',
  },
  kategoriBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 28,
    backgroundColor: '#fff2',
    elevation: 6,
    shadowColor: '#8A2BE2',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    marginBottom: 2,
    borderWidth: 1.5,
    borderColor: 'rgba(138,43,226,0.12)',
    transitionDuration: '200ms',
    transform: [{ scale: 1 }],
  },
  kategoriBtnSecili: {
    backgroundColor: '#fff',
    elevation: 8,
    transform: [{ scale: 1.10 }],
    borderWidth: 2.5,
    borderColor: '#8A2BE2',
    shadowColor: '#5A189A',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  kategoriBtnPressed: {
    shadowColor: '#fff',
    shadowOpacity: 0.3,
    transform: [{ scale: 1.04 }],
  },
  kategoriBtnText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
    letterSpacing: 0.5,
    transitionDuration: '200ms',
  },
  kategoriBtnTextSecili: {
    color: '#8A2BE2',
    fontSize: 19,
    fontWeight: 'bold',
  },
  subtitle: {
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
    textShadowColor: '#0002',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    alignSelf: 'flex-start',
  },
  malzemeCard: {
    flex: 1,
    margin: 6,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#fff8',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#8A2BE2',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    minWidth: 120,
    minHeight: 48,
    transitionDuration: '200ms',
    transform: [{ scale: 1 }],
  },
  malzemeCardSecili: {
    backgroundColor: '#8A2BE2',
    elevation: 5,
    transform: [{ scale: 1.06 }],
  },
  malzemeCardPressed: {
    shadowColor: '#fff',
    shadowOpacity: 0.2,
    transform: [{ scale: 1.03 }],
  },
  malzemeText: {
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
    letterSpacing: 0.2,
    transitionDuration: '200ms',
  },
  malzemeTextSecili: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  seciliMalzemelerContainer: {
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#fff3',
    borderRadius: 12,
    padding: 10,
    width: '100%',
  },
  seciliMalzemelerTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#fff',
  },
  seciliMalzemelerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  seciliMalzemeChip: {
    backgroundColor: '#9F4EDD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seciliMalzemeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  seciliMalzemeleriTemizleBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#8A2BE2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  seciliMalzemeleriTemizleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  tarifAraBtn: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#8A2BE2',
    elevation: 3,
    shadowColor: '#8A2BE2',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    alignSelf: 'stretch',
  },
  tariflerContainer: {
    marginTop: 20,
    marginBottom: 40,
    width: '100%',
  },
  tarifCard: {
    marginBottom: 16,
    borderRadius: 18,
    elevation: 4,
    shadowColor: '#8A2BE2',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: '#fff',
  },
  favIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  tarifBaslik: {
    fontWeight: 'bold',
    fontSize: 20,
    color: '#8A2BE2',
    letterSpacing: 0.2,
    marginBottom: 0,
  },
  tarifText: {
    fontSize: 14,
    marginBottom: 2,
    color: '#333',
  },
  yeniTarifBtn: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#8A2BE2',
    alignSelf: 'stretch',
    elevation: 0,
    shadowColor: 'transparent',
  },
});
