// Shadow config agar Vite tidak memakai postcss.config.js milik Laravel di root repo
// (yang butuh tailwindcss). Frontend saat ini memakai plain CSS.
// TODO: jika ingin Tailwind aktif, install tailwindcss+autoprefixer di frontend
// dan ganti file ini dengan config tailwind yang benar.
export default {
  plugins: {},
};
