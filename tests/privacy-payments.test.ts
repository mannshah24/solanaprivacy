import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Confidential } from '../lib/confidential';
import { SpectrePaymentSDK } from '../lib/payment-sdk';

// Example: ElGamal Encryption Test
export async function testElGamalEncryption() {
  console.log('Testing ElGamal encryption...');
  
  const keypair = await Confidential.generateKeypair();
  
  if (keypair.publicKey.length !== 32) {
    throw new Error('Invalid public key length');
  }
  
  if (keypair.privateKey.length !== 32) {
    throw new Error('Invalid private key length');
  }
  
  console.log('✅ ElGamal keypair generated successfully');
  return true;
}

// Example: Encrypt/Decrypt Test
export function testEncryptDecrypt() {
  console.log('Testing encrypt/decrypt...');
  
  const testAmount = 1000;
  const keypair = {
    publicKey: new Uint8Array(32),
    privateKey: new Uint8Array(32),
  };
  
  // Fill with test data
  for (let i = 0; i < 32; i++) {
    keypair.privateKey[i] = i;
    keypair.publicKey[i] = (i * 7 + 13) % 256;
  }

  const encrypted = Confidential.encryptAmount(testAmount, keypair.publicKey);
  
  if (encrypted.length !== 64) {
    throw new Error('Invalid ciphertext length');
  }

  const decrypted = Confidential.decryptBalance(encrypted, keypair.privateKey);
  
  if (decrypted !== testAmount) {
    throw new Error(`Decryption failed: expected ${testAmount}, got ${decrypted}`);
  }
  
  console.log('✅ Encrypt/decrypt works correctly');
  return true;
}

// Example: Range Proof Test
export function testRangeProof() {
  console.log('Testing range proof...');
  
  const amount = 500;
  const balance = 1000;
  const privateKey = new Uint8Array(32);
  
  const proof = Confidential.generateRangeProof(amount, balance, privateKey);
  
  if (proof.length !== 256) {
    throw new Error('Invalid proof length');
  }
  
  if (!Confidential.verifyRangeProof(proof)) {
    throw new Error('Proof verification failed');
  }
  
  console.log('✅ Range proof generated and verified');
  return true;
}

// Example: Insufficient Balance Test
export function testInsufficientBalance() {
  console.log('Testing insufficient balance rejection...');
  
  const amount = 1500; // More than balance
  const balance = 1000;
  const privateKey = new Uint8Array(32);
  
  try {
    Confidential.generateRangeProof(amount, balance, privateKey);
    throw new Error('Should have thrown insufficient balance error');
  } catch (error: any) {
    if (error.message === 'Insufficient balance') {
      console.log('✅ Insufficient balance correctly rejected');
      return true;
    }
    throw error;
  }
}

// Example: Key Storage Test
export function testKeyStorage() {
  console.log('Testing key storage...');
  
  const testWallet = Keypair.generate();
  const privateKey = new Uint8Array(32);
  crypto.getRandomValues(privateKey);

  Confidential.storePrivateKey(testWallet.publicKey, privateKey);
  
  const retrieved = Confidential.retrievePrivateKey(testWallet.publicKey);
  
  if (!retrieved || retrieved.length !== 32) {
    throw new Error('Failed to retrieve private key');
  }
  
  for (let i = 0; i < 32; i++) {
    if (retrieved[i] !== privateKey[i]) {
      throw new Error('Retrieved key does not match stored key');
    }
  }
  
  console.log('✅ Key storage and retrieval works');
  return true;
}

// Example: Balance Formatting Test
export function testBalanceFormatting() {
  console.log('Testing balance formatting...');
  
  const encryptedWithValue = {
    ciphertext: new Uint8Array(64),
    decryptedAmount: 1500.50,
  };

  const formatted1 = Confidential.formatBalance(encryptedWithValue);
  if (formatted1 !== '1,500.5 USDC') {
    throw new Error(`Formatting failed: expected '1,500.5 USDC', got '${formatted1}'`);
  }

  const encryptedWithoutValue = {
    ciphertext: new Uint8Array(64),
    decryptedAmount: null,
  };

  const formatted2 = Confidential.formatBalance(encryptedWithoutValue);
  if (formatted2 !== '████████ USDC (encrypted)') {
    throw new Error(`Formatting failed: expected encrypted placeholder, got '${formatted2}'`);
  }
  
  console.log('✅ Balance formatting works correctly');
  return true;
}

// Run all tests
export async function runAllTests() {
  console.log('\n🧪 Running Privacy Payment Tests...\n');
  
  try {
    await testElGamalEncryption();
    testEncryptDecrypt();
    testRangeProof();
    testInsufficientBalance();
    testKeyStorage();
    testBalanceFormatting();
    
    console.log('\n✅ All tests passed!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
}

// Auto-run if executed directly
if (typeof window === 'undefined') {
  runAllTests();
}
