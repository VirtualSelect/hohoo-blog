module.exports = function () {
  return {
    name: 'astra-shaders',
    configureWebpack() {
      return { module: { rules: [{ test: /\.(vert|frag|glsl)$/, type: 'asset/source' }] } };
    },
  };
};
