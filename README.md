# Store API

This is a Firebase application that uses Express.js and Firebase Admin SDK to manage and fetch product data. The project is developed in TypeScript and uses ESLint for linting. This was created as a part of comertial project for a small business. This project is only a REST API for the app. Note that this project is undergoing heavy restructuring on the experimental branch. For new changed please check that branch.

## Features
- Fetch all products
- Fetch a single product
- Add a new product
- Get all orders
- Fetching products based on category priority
- Sorting products inside a category based on priority

This API is still in development and will be updated with more features in the future.

## Getting Started

### Prerequisites

You need to have Node.js, npm, and Firebase CLI installed on your local machine.

### Installation

1. Clone the repository.
2. Navigate to the project directory.
3. Install the dependencies.
4. Navigate to the functions directory.
5. Install the dependencies for the functions.

### Running the Project

Start the Firebase emulators by running the following command in the root directory of the project:

\`\`\`sh
firebase emulators:start
\`\`\`

## Project Structure

- `functions/src/index.ts`: Main file where Express.js is set up and the routes are defined.
- `functions/.eslintrc.js`: Configuration for ESLint.
- `.gitignore`: List of file patterns that git should ignore.
- `firebase.json`: Configuration for Firebase.
- `package.json`: List of project dependencies and scripts.

## Technologies Used

- Firebase
- Express.js
- TypeScript
