# 🌟 NestJS Starter Kit

This project built with NestJS, TypeScript, and much more.

## Starter Introduction

This application use DDD pattern. Here you can learn a little about DDD pattern, [Visit me](https://www.geeksforgeeks.org/domain-driven-design-ddd)

---

## 🏆 Tips

Here's my opinions for write our code more clean and readable. So, you can follow it or ignore it.

1. Always using \_ (underscore) on your private property or method. In typescript, we also can use # (hashtag) to define private property or method Example:

```bash
private readonly _usersService: UsersService;
private _generateToken() {};

// or
#usersService: UsersService;
#generateToken() {};
```

Reason: Some languages like Python also use underscores to denote private or protected members. This convention can make it easier for developers familiar with multiple languages to recognize private members consistently.

Side Effect: -

2. Order naming your variables, function, etc to ascending.

```bash
export const useAuthenticationHook = () => {
  /**
   * @description Reactive data binding
   */
  const [authentication_accessToken, setAuthentication_accessToken] = useState();
  const [authentication_form, setAuthentication_form] = useState();

  const authentication_onCancel = () => {
     // Do something here
  }

  const authentication_onSubmit = () => {
     // Do something here
  }

  return {
    authentication_accessToken,
    authentication_form,
    authentication_onSubmit
  }
```

Reason: One of the most important reasons for creating variables, functions, and so on in ascending sequence is to make things easier while troubleshooting or adding features.

Side Effect: -

3. Create new domain/feature using custom command

```bash
Example: Let's say we want to create a new feature called "products." Instead of manually creating each component, we can leverage a powerful and user-friendly command.

Simply run the following command:
npm run generate:module name-of-feature

For example:
npm run generate:module products

```

What Does This Do?
This command automatically generates the necessary structure for your new feature, including:

- Controllers: Manages incoming requests and returns responses.
- DTOs (Data Transfer Objects): Defines the structure of data for requests and responses.
- Entities: Represents the data models and how they map to the database.
- Interfaces: Defines TypeScript interfaces for strong typing and consistency.
- Services: Contains the core business logic for your feature.

> With this command, you no longer need to manually use the Nest CLI for these tasks—saving you time and ensuring consistency across your project.

Why Use This Command?

- Efficiency: Automates the creation of boilerplate code and standard structure, allowing you to focus on business logic.
- Consistency: Ensures that every new feature follows the same structure and conventions, which improves maintainability.
- Convenience: Eliminates repetitive tasks and speeds up the development process.

Side Effects
By using this custom command, the following benefits are achieved:

- Reduced Setup Time: Developers can start working on the actual business logic almost immediately.
- Minimized Errors: The generated code adheres to best practices and reduces the likelihood of human error.
- Enhanced Developer Experience: A streamlined workflow that enhances productivity and satisfaction among developers.

### Conclusion:

Actually, there are plenty other approaches to make our code cleaner and easier to read for humans. However, at this time, I'd want to underline the two points listed above. Because, as previously said, I am using the same code approach in my project.

As a result, I ask any creators who want to participate in this project to keep the previously created code consistent.

## 📖 Notes

When we wish to include a new package or library into this project. I ask that you first conduct some study on the package or library that you intend to utilize.

When it comes to adding a new package or library, there are various factors to consider. Among them are:

1. Is the package or library frequently updated by its creator?
2. Is the package or library popular with other developers?
3. Does the package or library have a lot of issues?
4. Is the package or library small in size?
5. Is the package or library simple to use and has a big impact on our project? etc.

I believe we can add the desired package or library once it has passed the five criteria outlined above. However, if you wish to start a conversation regarding the package or library you want to add, please do so in the project's discussion thread on GitHub.

## 🎖️ Web Technologies

| Technology | Description                                                                                                                                                                      | Version |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| NestJS     | Nest is a framework for building efficient, scalable Node.js server-side applications. It uses modern JavaScript, is built with TypeScript combines elements of OOP, FP, and FRP | latest  |
| Typescript | JavaScript with syntax for types                                                                                                                                                 | latest  |
| TypeORM    | Data-Mapper ORM for TypeScript, ES7, ES6, ES5. Supports MySQL, PostgreSQL, MariaDB, SQLite, MS SQL Server, Oracle, MongoDB databases.                                            | latest  |
| JWT        | Nest - modern, fast, powerful node.js web framework (@jwt)                                                                                                                       | latest  |

## 🏅 Dependencies & Libraries

| Library           | Description                                                                                                               | Version |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| @nestjs/common    | Nest - modern, fast, powerful node.js web framework (@common)                                                             | latest  |
| @nestjs/config    | Nest - modern, fast, powerful node.js web framework (@config)                                                             | latest  |
| @nestjs/core      | Nest - modern, fast, powerful node.js web framework (@core)                                                               | latest  |
| @nestjs/jwt       | Nest - modern, fast, powerful node.js web framework (@jwt)                                                                | latest  |
| @nestjs/passport  | Nest - modern, fast, powerful node.js web framework (@passport)                                                           | latest  |
| @nestjs/swagger   | Nest - modern, fast, powerful node.js web framework (@swagger)                                                            | latest  |
| @nestjs/typeorm   | Nest - modern, fast, powerful node.js web framework (@typeorm).                                                           | latest  |
| bcrypt            | A bcrypt library for NodeJS.                                                                                              | latest  |
| class-transformer | Proper decorator-based transformation / serialization / deserialization of plain javascript objects to class constructors | latest  |
| class-validator   | Decorator-based property validation for classes.                                                                          | latest  |
| compression       | Node.js compression middleware.                                                                                           | latest  |
| husky             | Modern native Git hooks.                                                                                                  | latest  |
| pg                | PostgreSQL client - pure javascript & libpq with the same API                                                             | latest  |
| typeorm-extension | A library to create/drop database, simple seeding data sets                                                               | latest  |

## 🛠️ Setup Project

To get this project up and running in your development environment, follow these step-by-step instructions.

### 🍴 Prerequisites

We need to install or make sure that these tools are pre-installed on your machine:

- [NestJS](https://docs.nestjs.com): Nest (NestJS) is a framework for building efficient, scalable Node.js server-side applications.
- [NodeJS](https://nodejs.org/en/download/): It is a JavaScript runtime build.
- [Git](https://git-scm.com/downloads): It is an open source version control system.

## 🔍 Usage

### How To Use

To clone and run this application, you'll need [Git](https://git-scm.com) and [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com)) installed on your computer. From your command line:

### 🚀 Install Project

1. Clone the Repository

```bash
git clone https://github.com/existhink/NestJS-Starter-Kit.git
```

2. Install dependencies using bun

```shell
bun or bun install
```

3. Change **.env.example** to **.env**

You must change the .env.example to .env and match it with you local machine.

4. Run project for development

```shell
bun start:dev
```

---

## 🎉 Build The App

1. Build the app

```shell
bun build
```

## 🧪 Test

Run test across all files

```shell
bun test:unit
```

---

## 📂 Folder Structure

Project structure for this react starter

```javascript

.husky
|   |_______pre-commit                            // Pre-commit hook for husky.
src                                               // Entry point for the app.
|   |_______common                                // Contain all common for the app.
|   |   |_______constants                         // Contain all constants for the app.
|   |   |_______decorators                        // Contain all decorators for the app.
|   |   |_______dtos                              // Contain all dtos for the app.
|   |   |_______entities                          // Contain all entities for the app.
|   |   |_______guards                            // Contain all guards for the app.
|   |   |_______helpers                           // Contain all helpers for the app.
|   |   |_______interceptors                      // Contain all interceptors for the app.
|   |   |_______strategies                        // Contain all strategies for the app.
|   |_______configurations                        // Contain all configurations for the app.
|   |   |_______app                               // Contain core app configurations for the app.
|   |   |_______database                          // Contain database configurations for the app.
|   |   |_______jwt                               // Contain jwt configurations for the app.
|   |   |_______swagger                           // Contain swagger configurations for the app.
|   |_______database                              // Contain all database for the app including datasource and provider.
|   |_______modules                               // Contain all modules for the app.
|   |   |_______authentication                    // Contain all strategies for the app.
|   |   |   |_______controllers                   // Contain all controllers for authentication module.
|   |   |   |_______dtos                          // Contain all dtos for authentication module.
|   |   |   |_______entities                      // Contain all entities for authentication module.
|   |   |   |_______interfaces                    // Contain all interfaces for authentication module.
|   |   |   |_______services                      // Contain all services for authentication module.
|   |   |   |_______authentication.module.ts      // Main module for authentication module.
|   |   |_______{module-name}                     // Example module.
test                                              // Contain all test for the app.
```

### ⚒️ How to Contribute

Want to contribute? Great!

To fix a bug or enhance an existing module, follow these steps:

- Fork the repo
- Create a new branch (`git checkout -b improve-feature`)
- Make the appropriate changes in the files
- Add changes to reflect the changes made
- Commit your changes (`git commit -am 'Improve feature'`)
- Push to the branch (`git push origin improve-feature`)
- Create a Pull Request

### 📩 Bug / Feature Request

If you find a bug (the website couldn't handle the query and / or gave undesired results), kindly open an issue [here](https://github.com/existhink/NestJS-Starter-Kit/issues/new) by including your search query and the expected result.

If you'd like to request a new function, feel free to do so by opening an issue [here](https://github.com/existhink/NestJS-Starter-Kit/issues/new). Please include sample queries and their corresponding results.

## 📜 Credits

List your collaborators, if any, with links to their GitHub profiles.

I'd like to acknowledge my collaborators, who contributed to the success of this project. Below are links to their GitHub profiles.

Furthermore, I utilized certain third-party assets that require attribution. Find the creators' links in this section.

If I followed tutorials during development, I'd include the links to those as well.

👦 Rafi Khoirulloh <br>
Email: khoirulloh.rafi2@gmail.com <br>
GitHub: @apiiyu
