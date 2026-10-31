// One default for ordinary, local-watch and device builds. An explicit API
// override remains available for isolated local backend development.
const defaultApiOrigin = 'https://api.ohtautau.com';
function apiOrigin(environment = process.env) {
  return environment.TARO_APP_API_BASE_URL?.trim() || defaultApiOrigin;
}
module.exports = { defaultApiOrigin, apiOrigin };
