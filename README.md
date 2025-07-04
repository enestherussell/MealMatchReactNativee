# MealMatch 🍽️

Modern, gradient-based and user-friendly meal suggestion/favorites management app built with Expo, React Native, Firebase, and Gemini API.

## Features
- Select ingredients, get instant recipe suggestions (Gemini API)
- Save favorite recipes, manage in your profile (Firestore)
- Modern and responsive UI (gradient backgrounds, icons, cards)
- Profile image upload, favorite management, category icons
- Mobile and web support

## Screenshots

Add screenshots to the `screenshots/` folder and reference them here:

```
![Home](screenshots/home.png)
![Ingredients](screenshots/ingredients.png)
![Recipes](screenshots/recipes.png)
![Profile](screenshots/profile.png)
```

## Getting Started

1. **Clone the project:**
   ```sh
   git clone https://github.com/your-username/meal-match.git
   cd meal-match/yemek-oneri-app
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env`:
     ```sh
     cp .env.example .env
     ```
   - Add your Gemini API key to the `.env` file.
4. **Set up Firebase:**
   - Fill in your Firebase config in `firebase.js` or `firebase.ts`.
   - Enable Firestore and Authentication (email+password) in your Firebase project.
5. **Start the project:**
   ```sh
   npx expo start
   ```

## Environment Variables

Create a `.env` file in the root of `yemek-oneri-app`:
```
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key-here
```
> // Add your Gemini API key here. You can get it from Google AI Console.

## Notes
- Do not share your real API keys or secrets publicly!
- If you have issues, try `npm install` and `expo start` again.

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
