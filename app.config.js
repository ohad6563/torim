// Extends app.json. EXPO_BASE_URL lets the web build live under a sub-path,
// e.g. "/torim" for https://ohad6563.github.io/torim/.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || undefined,
  },
});
