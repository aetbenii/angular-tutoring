/**
 * Type-safe interface for Azure B2C ID Token Claims
 * Based on standard B2C token structure and custom claims
 */
export interface B2CTokenClaims {
  // Standard OIDC claims
  sub: string;                    // Subject (user ID)
  iss: string;                    // Issuer
  aud: string;                    // Audience
  exp: number;                    // Expiration time
  iat: number;                    // Issued at time
  nbf?: number;                   // Not before time
  
  // B2C specific claims
  ver: string;                    // Version
  acr?: string;                   // Authentication context class reference
  amr?: string[];                 // Authentication methods references
  
  // User profile claims
  name?: string;                  // Display name
  given_name?: string;            // First name
  family_name?: string;           // Last name
  email?: string;                 // Email address
  emails?: string[];              // Email addresses (array)
  preferred_username?: string;    // Preferred username
  
  // Custom B2C claims (may vary based on user flow configuration)
  extension_Role?: string;        // Custom role claim
  extension_Department?: string;  // Custom department claim
  
  // Additional optional claims that might be present
  tfp?: string;                   // Trust Framework Policy (user flow)
  azp?: string;                   // Authorized party
  azpacr?: string;               // Authorized party authentication context class reference
  scp?: string;                   // Scopes
  scope?: string;                 // Scope (alternative)
  
  // Object ID and tenant info
  oid?: string;                   // Object ID
  tid?: string;                   // Tenant ID
  
  // Application specific claims
  appid?: string;                 // Application ID
  appidacr?: string;             // Application authentication context class reference
  
  // Device and session claims
  deviceid?: string;              // Device ID
  ipaddr?: string;                // IP address
  
  // Additional custom claims (extend as needed)
  [key: string]: unknown;         // Allow for additional custom claims
}

/**
 * Type guard to check if an object contains valid B2C token claims
 */
export function isB2CTokenClaims(obj: unknown): obj is B2CTokenClaims {
  const claims = obj as Record<string, unknown>;
  return obj !== null && 
         typeof obj === 'object' &&
         typeof claims?.['sub'] === 'string' &&
         typeof claims?.['iss'] === 'string' &&
         typeof claims?.['aud'] === 'string' &&
         typeof claims?.['exp'] === 'number' &&
         typeof claims?.['iat'] === 'number';
}

/**
 * Utility type for extracting user profile information from B2C claims
 */
export interface B2CUserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  username: string;
  roles?: string[];
  department?: string;
}

/**
 * Helper function to extract user profile from B2C claims
 */
export function extractUserProfileFromClaims(claims: B2CTokenClaims): B2CUserProfile {
  return {
    id: claims.sub,
    email: claims.email || claims.emails?.[0] || claims.preferred_username || '',
    displayName: claims.name || `${claims.given_name || ''} ${claims.family_name || ''}`.trim() || claims.preferred_username || '',
    firstName: claims.given_name || '',
    lastName: claims.family_name || '',
    username: claims.preferred_username || claims.email || claims.sub,
    roles: claims.extension_Role ? [claims.extension_Role] : undefined,
    department: claims.extension_Department
  };
}