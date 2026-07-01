'use strict';
// Re-export shim: rbac.js → rbac-manager.js
// Any require('./governance/rbac') or require('./rbac') will resolve here.
module.exports = require('./rbac-manager');
