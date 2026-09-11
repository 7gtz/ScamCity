import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "design-system/**"] },
  // Explicit version: eslint-plugin-react's auto-detect uses an API ESLint 10 removed.
  { settings: { react: { version: "19.3" } } },
];

export default config;
