// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  webpack: (config, { isServer }) => {
    // Adiciona regra para excluir o arquivo HTML problemático
    config.module = {
      ...config.module,
      exprContextCritical: false,
      noParse: [/@mapbox\/node-pre-gyp\/lib\/util\/nw-pre-gyp\/index\.html$/],
    };

    return config;
  },
};

module.exports = nextConfig;
