const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const posts = [
  {
    slug: 'arquitectura-frontend-escalable',
    title: 'Arquitectura Frontend Escalable en Equipos Mixtos',
    excerpt:
      'Como mantener coherencia de UI y velocidad en un equipo que mezcla seniors y juniors sin frenar el delivery.',
    date: '2026-01-12',
    reading_time: '7 min',
    author: 'Lucia Andrade',
    role: 'Tech Lead Frontend',
    category: 'Arquitectura',
    tags: ['Frontend', 'Arquitectura', 'React'],
    cover:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    content: [
      'Los equipos mixtos necesitan limites claros para moverse rapido sin romper contratos. Arrancamos definiendo un core de componentes con tokens compartidos y un catalogo de patrones listos para reusar.',
      'Separar boundary entre UI y dominio evita fugas. Usamos adaptadores para que la UI reciba view models planos y los merges complejos queden en la capa de servicios.',
      'Documentar decisiones con RFC livianos permite que los juniors contribuyan sin miedo. Cada RFC incluye impacto, riesgos y plan de rollout con feature flags.',
      'La escalabilidad no solo es tecnica: establecer rotaciones de ownership y pairing semanal reduce cuellos de botella y mantiene consistente la experiencia.',
    ],
    key_takeaways: [
      'Define contratos de componentes que se puedan auditar con lint y pruebas visuales.',
      'Mantiene limites claros entre dominio y UI usando adaptadores.',
      'Prefiere RFC cortos y feature flags para evolucionar sin frenar releases.',
    ],
  },
  {
    slug: 'metricas-que-importan-en-producto',
    title: 'Metricas que Importan en Producto Digital',
    excerpt:
      'No todas las metricas empujan al negocio. Estos son los indicadores que usamos para alinear discovery, entrega y soporte.',
    date: '2026-01-25',
    reading_time: '6 min',
    author: 'Mateo Salas',
    role: 'Product Manager',
    category: 'Producto',
    tags: ['Producto', 'Analitica', 'UX'],
    cover:
      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1200&q=80',
    content: [
      'Arrancamos con una North Star que combina valor para el usuario y salud del negocio. Evitamos la tirania de metricas de vanidad como descargas o visitas aisladas.',
      'Cada feature se define con una hipotesis medible y su leading indicator. Ejemplo: para onboardings medimos activaciones completas en lugar de clics en el CTA.',
      'Los dashboards muestran tanto input como output metrics para no optimizar en vacio. Soporte y UX comparten la misma vista para detectar friccion temprano.',
      'Revisar las metricas en rituales quincenales permite ajustar rapido. Si un indicador no gatilla decisiones en dos ciclos, lo eliminamos.',
    ],
    key_takeaways: [
      'Define una North Star que combina valor usuario y negocio.',
      'Liga cada feature a una hipotesis y su leading indicator.',
      'Depura dashboards que no cambian decisiones en dos ciclos.',
    ],
  },
  {
    slug: 'diseno-de-sistemas-para-startups',
    title: 'Diseno de Sistemas para Startups en Crecimiento',
    excerpt:
      'Diseñar pensando en el hoy y el proximo trimestre: decisiones livianas que no hipotecan el futuro del sistema.',
    date: '2025-12-20',
    reading_time: '8 min',
    author: 'Valentina Rios',
    role: 'Staff Engineer',
    category: 'Sistemas',
    tags: ['Sistemas', 'Escalabilidad', 'Cloud'],
    cover:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
    content: [
      'En early-stage conviene diseñar en capas removibles. Un gateway ligero permite cambiar proveedores sin tocar el core.',
      'La observabilidad es la primera deuda que pagamos. Loguear con contexto de negocio evita excavar en trazas infinitas.',
      'Las decisiones se evalúan por costo de reversibilidad. Si algo es caro de revertir, lo probamos primero como experimento de borde con un solo cliente.',
      'Los docs breves con diagramas C4 nos ayudaron a alinear al equipo remoto y a onboardear nuevos devs en menos de una semana.',
    ],
    key_takeaways: [
      'Disena capas removibles y evita dependencias pegadas al core.',
      'Prioriza observabilidad antes de optimizar performance.',
      'Mide el costo de revertir antes de tomar una decision arquitectonica.',
    ],
  }
];

async function seedDatabase() {
  try {
    console.log('Seeding database...');

    for (const post of posts) {
      await pool.query(
        'INSERT INTO posts (slug, title, excerpt, date, reading_time, author, role, category, tags, cover, content, key_takeaways) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (slug) DO NOTHING',
        [
          post.slug,
          post.title,
          post.excerpt,
          post.date,
          post.reading_time,
          post.author,
          post.role,
          post.category,
          JSON.stringify(post.tags),
          post.cover,
          JSON.stringify(post.content),
          JSON.stringify(post.key_takeaways)
        ]
      );
    }

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await pool.end();
  }
}

seedDatabase();