import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { Stack, useRouter, Link } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const USER_KEY = 'current_user';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      // Firestore'da kullanıcıyı ara
      const q = query(collection(db, 'users'), where('email', '==', username), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Giriş başarılı
        const userDoc = querySnapshot.docs[0].data();
        await AsyncStorage.setItem(USER_KEY, JSON.stringify({ email: userDoc.email }));
        router.replace('/(tabs)');
      } else {
        setError('Kullanıcı adı veya şifre yanlış!');
      }
    } catch (err: any) {
      setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Giriş Yap' }} />
      <LinearGradient colors={['#8A2BE2', '#5A189A']} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Yemek Öneri Uygulamasına Hoşgeldin!</Text>
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'} onPress={handleLogin} disabled={loading} />
          <Link href={{ pathname: '/register' }} style={styles.registerLink}>
            <Text style={{ color: '#2196f3', marginTop: 16 }}>Kayıt Ol</Text>
          </Link>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 12,
  },
  registerLink: {
    marginTop: 16,
  },
}); 