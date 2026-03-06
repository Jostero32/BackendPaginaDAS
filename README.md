# Backend API para Posts

Este backend proporciona una API REST para gestionar posts de blog usando PostgreSQL.

## Configuración

1. **Instalar PostgreSQL**: Asegúrate de tener PostgreSQL instalado y corriendo en tu sistema.

2. **Crear base de datos**: Crea una base de datos llamada `pagina_grupal_das` (o el nombre que prefieras).

3. **Configurar credenciales**: Edita el archivo `.env` con tus credenciales de PostgreSQL:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pagina_grupal_das
   DB_USER=tu_usuario
   DB_PASSWORD=tu_password
   PORT=3001
   ```

4. **Crear tabla**: Ejecuta el script SQL para crear la tabla:
   ```bash
   psql -U tu_usuario -d pagina_grupal_das -f schema.sql
   ```

5. **Instalar dependencias**:
   ```bash
   npm install
   ```

6. **Poblar base de datos** (opcional):
   ```bash
   npm run seed
   ```

7. **Iniciar servidor**:
   ```bash
   npm run dev  # Para desarrollo con nodemon
   npm start    # Para producción
   ```

## API Endpoints

- `GET /posts` - Obtener todos los posts
- `GET /posts/:slug` - Obtener post por slug
- `POST /posts` - Crear nuevo post
- `PUT /posts/:slug` - Actualizar post
- `DELETE /posts/:slug` - Eliminar post

## Esquema de la Base de Datos

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  date DATE,
  reading_time VARCHAR(50),
  author VARCHAR(255),
  role VARCHAR(255),
  category VARCHAR(100),
  tags JSONB,
  cover TEXT,
  content JSONB,
  key_takeaways JSONB
);
```