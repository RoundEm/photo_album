const { withPlaiceholder } = require("@plaiceholder/next")

module.exports = withPlaiceholder({
    webpack5: true,
    webpack: (config) => {
        config.resolve.fallback = { fs: false,  };
        return config;
    },
    images: {
        domains: ['res.cloudinary.com'],
    },
})

