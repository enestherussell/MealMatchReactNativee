import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform, Alert } from 'react-native';
import { Stack, useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Button, Avatar, IconButton, useTheme } from 'react-native-paper';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const USER_KEY = 'current_user';
const { width } = Dimensions.get('window');
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; // Gemini API key is now loaded from environment variables for security. See .env.example for instructions.

export default function ProfileScreen() {
  const router = useRouter();
  const [favoriler, setFavoriler] = useState<string[]>([]);
  const [user, setUser] = useState<{ email: string, createdAt?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [yeniTarif, setYeniTarif] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const theme = useTheme();

  useFocusEffect(
    useCallback(() => {
      const loadUserAndFavorites = async () => {
        try {
          const u = await AsyncStorage.getItem(USER_KEY);
          if (u) {
            const userObj = JSON.parse(u);
            setUser(userObj);
            // Profil resmi localde varsa yükle
            const img = await AsyncStorage.getItem('profile_image_' + userObj.email);
            if (img) setProfileImage(img);
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
    }, [])
  );

  const handleLogout = async () => {
    await AsyncStorage.removeItem(USER_KEY);
    router.replace('/login');
  };

  const favoriBilgileri = () => {
    if (!favoriler.length) return { son: '-', toplam: 0 };
    return { son: 'Şimdi', toplam: favoriler.length };
  };

  const favoridenKaldir = async (tarif: string) => {
    if (!user) return;
    try {
      const favRef = doc(db, 'favorites', user.email);
      await updateDoc(favRef, { items: arrayRemove(tarif) });
      setFavoriler(prev => prev.filter(f => f !== tarif));
    } catch {}
  };

  const yeniFavoriTarifBul = async () => {
    setLoading(true);
    setYeniTarif(null);
    try {
      const prompt = `Aşağıdaki favori yemek tariflerine benzer, yeni ve farklı bir yemek tarifi öner. Sadece bir tarif öner ve şu şablonda ver:\n\nBaşlık: [Tarif Adı]\nMalzemeler: [Malzeme Listesi]\nYapılışı: [Kısa Açıklama]\n\nFavoriler:\n${favoriler.join('\n')}`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
      });
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      setYeniTarif(text);
    } catch {
      setYeniTarif('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Profil resmi seçme
  const pickProfileImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0].uri) {
      setProfileImage(result.assets[0].uri);
      if (user) await AsyncStorage.setItem('profile_image_' + user.email, result.assets[0].uri);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Profil' }} />
      <LinearGradient colors={['#8A2BE2', '#5A189A']} style={styles.gradientBg}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarBox}>
            <Avatar.Image
              size={90}
              source={profileImage ? { uri: profileImage } : { uri: 'https://ui-avatars.com/api/?name=' + (user?.email || 'Kullanıcı') + '&background=7b2ff2&color=fff' }}
              style={styles.avatar}
            />
            <Button mode="outlined" onPress={pickProfileImage} style={styles.avatarBtn} labelStyle={{ color: '#7b2ff2', fontWeight: 'bold' }}>Profil Resmi Yükle</Button>
            <View style={styles.profileTitleRow}>
              <Avatar.Icon size={32} icon="account-circle" color="#fff" style={styles.profileIcon} />
              <Text style={styles.title}>Profil</Text>
            </View>
            <Text style={styles.email}>{user?.email || 'Kullanıcı adı yok'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Kayıt Tarihi</Text>
              <Text style={styles.infoValue}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Favori Sayısı</Text>
              <Text style={styles.infoValue}>{favoriBilgileri().toplam}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Son Favori</Text>
              <Text style={styles.infoValue}>{favoriBilgileri().son}</Text>
            </View>
          </View>
          <Button mode="contained" onPress={handleLogout} style={styles.logoutBtn} labelStyle={{ fontWeight: 'bold', fontSize: 16 }}>Çıkış Yap</Button>
          <Text style={styles.favTitle}>Favori Tarifler</Text>
          {favoriler.length === 0 ? (
            <Text style={styles.noFav}>Henüz favori tarif yok.</Text>
          ) : (
            favoriler.map((tarif, idx) => (
              <Card key={idx} style={styles.favCard}>
                <Card.Content>
                  <View style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>
                    <IconButton
                      icon="star"
                      iconColor="#FFD700"
                      size={28}
                      onPress={() => favoridenKaldir(tarif)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    {tarif.split('\n').map((line, i) => (
                      <Text key={i} style={line.startsWith('Başlık:') ? styles.tarifBaslik : styles.tarifText}>{line}</Text>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
          <Button mode="contained" onPress={yeniFavoriTarifBul} style={styles.yeniTarifBtn} labelStyle={{ fontWeight: 'bold', fontSize: 16 }} loading={loading} disabled={loading || favoriler.length === 0}>
            Yeni Favori Tarifini Bul
          </Button>
          {yeniTarif && (
            <Card style={styles.yeniTarifCard}>
              <Card.Content>
                <View style={{ position: 'absolute', top: 0, right: 0, zIndex: 2 }}>
                  <IconButton
                    icon="star-outline"
                    iconColor="#bbb"
                    size={28}
                    onPress={async () => {
                      if (user && yeniTarif && !favoriler.includes(yeniTarif)) {
                        const favRef = doc(db, 'favorites', user.email);
                        await updateDoc(favRef, { items: arrayRemove(yeniTarif) }); // önce varsa kaldır
                        await updateDoc(favRef, { items: arrayUnion(yeniTarif) }); // sonra ekle
                        setFavoriler(prev => [...prev, yeniTarif]);
                        Alert.alert('Favorilere eklendi!');
                      }
                    }}
                  />
                </View>
                {yeniTarif.split('\n').map((line, i) => (
                  <Text key={i} style={line.startsWith('Başlık:') ? styles.tarifBaslik : styles.tarifText}>{line}</Text>
                ))}
              </Card.Content>
            </Card>
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
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        background: 'linear-gradient(135deg, #1e90ff 0%, #7b2ff2 100%)',
      },
      default: {
        backgroundColor: '#1e90ff',
      },
    }),
  },
  container: {
    padding: 20,
    minHeight: width > 500 ? 600 : 400,
    backgroundColor: 'transparent',
    flexGrow: 1,
    alignItems: 'center',
  },
  avatarBox: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  profileIcon: {
    backgroundColor: 'transparent',
    marginRight: 2,
  },
  avatar: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: '#0002',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  email: {
    fontSize: 16,
    color: '#f3f0fa',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#f3f0fa',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#7b2ff2',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#7b2ff2',
    marginBottom: 2,
  },
  infoValue: {
    color: '#1e90ff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  logoutBtn: {
    marginBottom: 18,
    borderRadius: 20,
    backgroundColor: '#1e90ff',
    alignSelf: 'stretch',
    elevation: 3,
    shadowColor: '#1e90ff',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  favTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
    color: '#fff',
    alignSelf: 'flex-start',
  },
  noFav: {
    color: '#f3f0fa',
    fontStyle: 'italic',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  favCard: {
    backgroundColor: 'rgba(240,240,245,0.85)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#7b2ff2',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    width: '100%',
  },
  avatarBtn: {
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 16,
    borderColor: '#7b2ff2',
    borderWidth: 2,
    alignSelf: 'center',
  },
  yeniTarifBtn: {
    marginTop: 12,
    borderRadius: 20,
    backgroundColor: '#7b2ff2',
    alignSelf: 'stretch',
    elevation: 3,
    shadowColor: '#7b2ff2',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  yeniTarifCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#1e90ff',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    width: '100%',
  },
  tarifBaslik: {
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 6,
    color: '#7b2ff2',
    letterSpacing: 0.2,
  },
  tarifText: {
    fontSize: 14,
    marginBottom: 2,
    color: '#333',
  },
}); 