let jwt = require('jsonwebtoken')
let fs = require('fs')
let path = require('path')
let crypto = require('crypto')

function normalizePem(value) {
    if (!value) {
        return null
    }
    return value.replace(/\\n/g, '\n')
}

function readPemFile(filePath) {
    try {
        if (!filePath || !fs.existsSync(filePath)) {
            return null
        }
        return fs.readFileSync(filePath, 'utf8')
    } catch (error) {
        return null
    }
}

let privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'keys', 'jwtRS256.key')
let publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || path.join(__dirname, '..', 'keys', 'jwtRS256.key.pub')

let privateKey = normalizePem(process.env.JWT_PRIVATE_KEY) || readPemFile(privateKeyPath)
let publicKey = normalizePem(process.env.JWT_PUBLIC_KEY) || readPemFile(publicKeyPath)

if (!privateKey || !publicKey) {
    let keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    })
    privateKey = keyPair.privateKey
    publicKey = keyPair.publicKey
    console.warn('[jwt] RSA keys not found in env/file. Using in-memory temporary key pair.')
}

module.exports = {
    signToken: function (payload, options = {}) {
        return jwt.sign(payload, privateKey, {
            algorithm: 'RS256',
            ...options
        })
    },
    verifyToken: function (token) {
        return jwt.verify(token, publicKey, {
            algorithms: ['RS256']
        })
    }
}
