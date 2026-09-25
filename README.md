# What to Cook?

## Description

What to Cook? is a mobile-first meal spinner for making weeknight dinner decisions. It chooses one main and one or two sides, shows the ingredients and method, and keeps meals a signed-in user has marked as made out of that week’s future spins. A cooking week runs Monday through Sunday.

## Features

- Random main-and-side dinner selection
- 10 seed mains and 10 seed sides
- Recipe pages with structured ingredients, cooking steps, difficulty, cooking time, and servings
- Email/password registration, login, logout, and per-user profile data
- Per-user current-week history
- Weekly meal exclusions after an explicit Mark as Made action
- Guest browsing with a sign-in prompt before history is saved
- Empty, loading, and friendly error states
- Mobile, tablet, and desktop layouts
- Firestore and Storage security rules
- Render static-site configuration with a React Router rewrite
- Core Vitest coverage for selection, weekly dates, empty data, and authentication guarding

## Tech Stack

- React
- Vite
- JavaScript ES6+
- CSS
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- React Router
- React Context API
- Vitest
- React Testing Library
- Render
- GitHub

## Project Structure

    src/
      components/       Reusable UI pieces
      context/          Authentication state
      data/             Seed recipe source
      pages/            Route-level screens
      services/         Firebase and Firestore calls
      utils/            Selection, week, and guard logic
    scripts/
      seedMeals.js      Secure Admin SDK seed command
    firestore.rules     Firestore access controls
    storage.rules       Storage access controls
    firestore.indexes.json
    render.yaml         Render static-site configuration

The application follows a deliberate boundary:

    UI → React components → application utilities → service layer → Firebase

Route pages do not contain direct Firestore queries. Firebase calls stay in service files so new features can be added without rewriting the UI.

## Requirements

- Node.js 20 or later
- npm
- A Firebase project
- A GitHub account and a Render account for deployment

## Local Installation

    git clone <your-repository-url>
    cd what-to-cook
    npm install
    cp .env.example .env
    npm run dev

Open the local URL printed by Vite.

Without Firebase environment variables, the app opens in a clearly marked recipe-preview mode using the provided seed recipes. Add Firebase configuration to enable accounts and saved history.

## Firebase Setup

1. In the [Firebase console](https://console.firebase.google.com/), create a project and register a **Web app**. In Project settings → Your apps, copy the six values from the web app’s SDK configuration.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create **Firestore Database** in production mode. Keep the database ID as `(default)`; the seed script writes to that database.
4. Create **Storage** in production mode. The storage location cannot be changed later, so select a region close to your users.
5. Copy `.env.example` to `.env` and add the six web-app values. Do not commit `.env`.
6. From the project folder, log in to Firebase and deploy the included security rules:

       npx firebase-tools login
       npx firebase-tools use <your-project-id>
       npx firebase-tools deploy --only firestore,storage --project <your-project-id>

7. Seed the meals collection. In Firebase Project settings → Service accounts → Firebase Admin SDK, generate a private-key JSON file. Keep it outside the repository and out of Git. In Git Bash, point `GOOGLE_APPLICATION_CREDENTIALS` at the exact downloaded file, then run the seed:

       export GOOGLE_APPLICATION_CREDENTIALS="/c/Users/<your-windows-user>/Downloads/<service-account-file>.json"
       npm run seed

   The command should finish with `Seeded 20 meals.` Refresh the app afterwards.

The seed command adds 20 starter records to the meals collection: 10 mains and 10 sides. It uses Firebase Admin credentials because normal app users must not be allowed to alter the shared recipe catalogue.

### Firestore Data Shape

    users/{userId}
      userId, name, email, createdAt

    meals/{mealId}
      name, type, description, imageUrl, ingredients[], instructions[],
      cookingTime, servings, difficulty

    weeklyMeals/{recordId}
      userId, mainMealId, sideMealIds[], mainMeal, sideMeals[],
      dateMade, weekKey, createdAt

Meals are marked with a type of main or side. Ingredients are structured objects with name, quantity, and unit rather than a long formatted string.

## Environment Variables

Copy .env.example to .env and fill in:

    VITE_FIREBASE_API_KEY=
    VITE_FIREBASE_AUTH_DOMAIN=
    VITE_FIREBASE_PROJECT_ID=
    VITE_FIREBASE_STORAGE_BUCKET=
    VITE_FIREBASE_MESSAGING_SENDER_ID=
    VITE_FIREBASE_APP_ID=

Do not commit .env. Vite variables beginning with VITE_ are delivered to the browser and therefore are not secrets. Firebase Authentication and Firestore/Storage Security Rules protect data; the client Firebase configuration does not replace security rules.

## Firebase Security

The included Firestore rules allow everyone to read the shared recipe catalogue, but only a user carrying an admin custom claim can change it. A signed-in user can create, read, update, or delete only their own profile and weekly meal records. Rules verify that the record userId matches the authenticated Firebase UID, so changing a user ID in the frontend cannot expose or modify another person’s history.

The Storage rules keep meal-image reads public while restricting uploads to an admin custom claim. This keeps the first version ready for future recipe imagery without making uploads broadly writable.

## Running Tests

    npm test

For an interactive test session:

    npm run test:watch

The tests cover weekly boundaries, selection exclusions, the all-mains-cooked empty state, and authenticated versus unauthenticated saving behavior. They test application logic rather than Firebase itself.

## Production Build

    npm run build

The production files are written to dist.

## Render Deployment

1. Push this repository to GitHub.
2. In Render, create **New → Static Site** and connect the repository. Do not create a Web Service; this Vite project has no `npm start` command.
3. Set the build command to:

       npm install && npm run build

4. Set the publish directory to exactly:

       dist

5. Open **Environment** and add each `VITE_FIREBASE_*` key from `.env` as an Environment Variable. Copy only each value after `=`. Local `.env` files are not uploaded to Render automatically.
6. Save with **Save, rebuild, and deploy**. If Firebase still appears unconfigured, use **Manual Deploy → Clear build cache & deploy** so Vite rebuilds with the variables.
7. Open **Redirects/Rewrites**, add `/*` as Source and `/index.html` as Destination, then select **Rewrite**. This is essential for refreshing routes such as `/week`, `/login`, and `/meals/chicken-curry` without a 404.
8. Deploy. Render provides an `onrender.com` URL and redeploys automatically when changes are pushed to the selected Git branch. The supplied `render.yaml` captures the same static-site build and rewrite setup for Render Blueprint users.

## Current V1 Limitations

- No recipe-management screen: shared recipes are seeded or maintained by an administrator.
- No household or shared history.
- No shopping-list aggregation or meal calendar.
- No image-upload UI yet, although Storage rules and optional imageUrl fields are ready.
- A main and its selected sides are saved as a single completed dinner record.

# Future Upgrades

## V2 — Better meal selection

- Breakfast, lunch, and dinner categories
- Dietary and vegetarian preferences
- Budget, cooking-time, difficulty, and cuisine filters
- Ingredient exclusions

## V3 — Household support

- Family or household records
- Shared meal history for multiple users

## V4 — Shopping list

- Ingredient aggregation from a selection
- Check-off shopping workflow

## V5 — Meal planning

- Planned meals for Monday through Sunday

## V6 — Ratings and favourites

- One-to-five recipe ratings
- Favourite recipe list

## V7 — History analytics

- Most and least cooked meals
- Monthly cooking trends

## V8 — Recipe management

- Administrator recipe creation, editing, deletion, and image uploads

## V9 — AI meal suggestions

- Ingredient-led suggestions
- Personalised recipe ideas

# Development Roadmap

## V1 — Core Application

Status: Current

- Authentication
- Main/side meals
- Random spinner
- Ingredients
- Meal details
- Weekly history
- Weekly exclusions
- Responsive UI
- Firebase
- Render deployment

## V2 — Preferences

Status: Planned

- Dietary preferences
- Cuisine preferences
- Cooking time
- Difficulty
- Ingredient exclusions

## V3 — Shopping

Status: Planned

- Shopping list
- Ingredient aggregation
- Check-off system

## V4 — Planning

Status: Planned

- Weekly meal planner
- Scheduled meals

## V5 — Social / Household

Status: Planned

- Shared household
- Multiple users
- Shared meal history

## V6 — AI

Status: Planned

- Ingredient-based suggestions
- Personalised recommendations
- Recipe generation

# Change Management

Do not immediately rewrite the existing architecture when a feature is requested. Before implementation:

1. Define the feature and its intended user outcome.
2. Check whether the current Firestore data supports it.
3. Decide whether a collection, field, index, or rule must be added.
4. Assess how existing users and data could be affected.
5. Implement the smallest compatible change.
6. Add or update tests.
7. Update this documentation and the roadmap.
8. Commit the change separately from unrelated work.

For example, dietary preferences can be introduced with a dietaryTags array on meals. The selection service can then filter by those tags without replacing the meal model.

## Versioning

Use semantic version labels:

- V1.0.0 for the first core release
- V1.1.0 for compatible new features
- V1.1.1 for bug fixes
- V2.0.0 for breaking architectural or database changes

Use MAJOR for breaking architecture or database changes, MINOR for new compatible features, and PATCH for corrections.

## Suggested Git Workflow

Keep future commits narrow and reviewable. A healthy sequence is: project setup, routing/layout, Firebase configuration, authentication, recipe structure, seed data, spinner, weekly tracking, recipe details, responsive polish, tests, deployment documentation. Avoid one giant mixed-purpose commit.
