# ApuestasFront

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.15.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.





npm i -g @nestjs/cli
nest new apuestas-back
apuestas-back

# PostgreSQL usando TypeORM
npm install --save @nestjs/typeorm typeorm pg

# Instalar el cliente de producción
npm install @prisma/client

# Instalar la CLI de Prisma como dependencia de desarrollo
npm install -D prisma

# Inicializar la configuración de Prisma
npx prisma init

Esto creará una carpeta llamada prisma con un archivo schema.prisma, y un archivo .env en la raíz de tu proyecto.

nest generate module prisma
nest generate service prisma --no-spec

nest generate resource partidos --no-spec
nest generate resource votos --no-spec


npm install @prisma/client
npx prisma generate

npm run start:dev


npm install @prisma/adapter-pg pg
npm install -D @types/pg



http://localhost:3000/partidos

{
"fase": "Fase de Grupos",
"equipoLocal": "de",
"equipoVisitante": "cw",
"fechaHora": "2026-06-14T13:00:00Z"
}


http://localhost:3000/votos
{
"usuarioId": 1,
"partidoId": 1,
"pronostico": "LOCAL"
}

VISITANTE

LOCAL
2026-06-14T13:00:00-04:00

http://localhost:3000/partidos/1/finalizar
{
"golesLocal": 7,
"golesVisitante": 1
}


npm install -g @angular/cli

ng new apuestas-front --routing --style css

# 3. Entra a la carpeta de tu nuevo frontend
cd apuestas-front

ng add @angular/pwa

ng generate component components/match-card


npx prisma db pull
npx prisma generate

nest g mo auth


ng serve --configuration development

npx prisma migrate dev --name agregar_avatar
npx prisma generate

Una vez que comprobemos que los perfiles y el PIN funcionan impecablemente en pantalla, ¿qué te parece si armamos una pestaña de "Ranking" (Tabla de posiciones) para que vean quién va ganando puntos conforme los partidos vayan finalizando?



{
"fase": "Grupo E",
"equipoLocal": "se",
"equipoVisitante": "th",
"fechaHora": "2026-06-14T22:00:00-04:00"
}



Una vez que compruebes que esto funciona, solo nos faltaría una cosa para que la aplicación esté 100% terminada y lista para compilarse en los celulares: un login simple para que Ángela, el tercer participante y tú puedan entrar con su nombre y el sistema sepa qué ID de usuario usar, en lugar de dejar el 1 quemado en el código. ¿Te parece el siguiente paso?

