// DNS Fix: Monkey-patch dns.lookup to use Google/Cloudflare DNS
// when the system DNS resolver fails (e.g., corporate networks blocking Neon queries)
const dns = require('dns');
const { Resolver } = dns;
const net = require('net');

const resolver = new Resolver();
resolver.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const originalLookup = dns.lookup;

dns.lookup = function patchedLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (typeof options === 'number') {
    options = { family: options };
  }
  
  // Skip patching for localhost/IPs
  if (hostname === 'localhost' || hostname === '127.0.0.1' || net.isIP(hostname)) {
    return originalLookup.call(dns, hostname, options, callback);
  }

  // Try original lookup first, fall back to custom resolver
  originalLookup.call(dns, hostname, options, (err, address, family) => {
    if (!err) {
      return callback(null, address, family);
    }
    
    // Fallback: use custom DNS resolver
    const wantIPv6 = options && options.family === 6;
    
    const tryResolve4 = () => {
      resolver.resolve4(hostname, (resolveErr, addresses) => {
        if (resolveErr || !addresses || addresses.length === 0) {
          tryResolve6();
        } else {
          if (options && options.all) {
            return callback(null, addresses.map(a => ({ address: a, family: 4 })));
          }
          return callback(null, addresses[0], 4);
        }
      });
    };
    
    const tryResolve6 = () => {
      resolver.resolve6(hostname, (resolveErr, addresses) => {
        if (resolveErr || !addresses || addresses.length === 0) {
          return callback(err); // Return original error
        }
        if (options && options.all) {
          return callback(null, addresses.map(a => ({ address: a, family: 6 })));
        }
        return callback(null, addresses[0], 6);
      });
    };
    
    if (wantIPv6) {
      tryResolve6();
    } else {
      tryResolve4();
    }
  });
};

console.log('[DNS-Fix] ✅ Patched DNS lookup with Google/Cloudflare fallback');
