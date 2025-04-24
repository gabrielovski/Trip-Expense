// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Desabilita indicadores de desenvolvimento para melhor performance
  devIndicators: false,

  // Otimizações para melhorar o carregamento inicial
  reactStrictMode: true,

  // Compressão de imagens para melhor performance
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Configurações personalizadas do webpack
  webpack: (config, { isServer }) => {
    // Ignora o arquivo HTML problemático
    config.module = {
      ...config.module,
      exprContextCritical: false,
      noParse: [/@mapbox\/node-pre-gyp\/lib\/util\/nw-pre-gyp\/index\.html$/],
    };

    // Otimizações adicionais apenas para produção
    if (!isServer) {
      // Reduz tamanho dos bundles
      config.optimization = {
        ...config.optimization,
        mergeDuplicateChunks: true,
        minimize: true,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
