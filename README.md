# Instrucciones de Integración y Despliegue del Proyecto Battleship

Este documento describe los pasos necesarios para integrar y desplegar el proyecto Battleship, que consta de un backend en Laravel y un frontend en Angular.

## Requisitos Previos

- PHP 8.1 o superior
- Composer
- Node.js 16 o superior
- npm o yarn
- MySQL o MariaDB
- Git

## Pasos para Configurar el Proyecto

### 1. Clonar el Repositorio

```bash
git clone git@github.com:VIMAGOO/BattleshipGame.git
cd battleship
```

### 2. Configurar el Backend (Laravel)

```bash
# Entrar al directorio del backend
cd backend

# Instalar dependencias de PHP
composer install

# Copiar el archivo de configuración
cp .env.example .env

# Generar clave de aplicación
php artisan key:generate

# Configurar .env con los datos de tu base de datos
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=battleship
# DB_USERNAME=root
# DB_PASSWORD=root

# Crear la base de datos (si no existe)
# En MySQL:
CREATE DATABASE battleship;

# Ejecutar migraciones y seeders
php artisan migrate

# Crear enlace simbólico para storage
php artisan storage:link
```

### 3. Configurar el Frontend (Angular)

```bash
# Volver al directorio raíz y entrar al frontend
cd ../frontend

# Instalar dependencias de Node.js
npm install

# Editar el archivo de entorno (si es necesario)
```

### 4. Ejecutar el Proyecto en Desarrollo

#### Backend (Laravel)

```bash
# En el directorio backend
php artisan serve
```

El backend estará disponible en: `http://localhost:8000`

#### Frontend (Angular)

```bash
# En el directorio frontend
ng serve
```

El frontend estará disponible en: `http://localhost:4200`

## Estructura del Proyecto

### Backend (Laravel)

La estructura del backend sigue la convención de Laravel:

```
backend/
├── app/                      # Lógica principal
│   ├── Constants/            # Constantes del juego
│   ├── Http/Controllers/     # Controladores de la API
│   ├── Models/               # Modelos del dominio
│   └── Services/             # Servicios del juego
├── config/                   # Configuración
├── database/                 # Migraciones y seeders
├── routes/                   # Definición de rutas API
└── ...
```

### Frontend (Angular)

La estructura del frontend está organizada por funcionalidad:

```
frontend/
├── src/
│   ├── app/
│   │   ├── guards/           # Guardias de autenticación
│   │   ├── interceptors/     # Interceptores HTTP
│   │   ├── models/           # Interfaces de datos
│   │   ├── pages/            # Componentes de página
│   │   ├── services/         # Servicios de acceso a datos
│   │   └── shared/           # Componentes compartidos
│   ├── assets/               # Recursos estáticos
│   └── environments/         # Configuración por entorno
└── ...
```