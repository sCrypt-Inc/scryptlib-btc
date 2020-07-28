import { assert } from 'chai';
import { loadDescription, newTx } from './helper';
import { buildContractClass, AbstractContract, TxContext } from '../src/contract';
import { FunctionCall } from '../src/abi';
import { bsv, signTx, toHex } from '../src/utils';
import { Sig, PubKey, Ripemd160 } from '../src/scryptTypes';

const privateKey = new bsv.PrivateKey.fromRandom('testnet');
const publicKey = privateKey.publicKey;
const pubKeyHash = bsv.crypto.Hash.sha256ripemd160(publicKey.toBuffer());
const inputSatoshis = 100000;
const tx = newTx(inputSatoshis);
const txContext = { inputSatoshis, tx };

const jsonDescr = loadDescription('p2pkh.scrypt');

describe('buildContractClass()', () => {

  const DemoP2PKH = buildContractClass(jsonDescr);

  it('should return a reflected contract class object', () => {
    assert.typeOf(DemoP2PKH, 'function');
    assert.deepEqual(DemoP2PKH.abi, jsonDescr.abi);
    assert.deepEqual(DemoP2PKH.asm, jsonDescr.asm);
  })

  describe('instance of the returned contract class', () => {

    let instance: any;
    let sig: any;
    let unlockingScriptASM: string;

    beforeEach(() => {
      instance = new DemoP2PKH(new Ripemd160(toHex(pubKeyHash)));
      sig = signTx(tx, privateKey, instance.lockingScript.toASM(), inputSatoshis);
      unlockingScriptASM = [toHex(sig), toHex(publicKey)].join(' ');
    })

    it('should be an instance of AbstractContract', () => {
      assert.instanceOf(instance, AbstractContract);
    })

    describe('.codePart', () => {
      it('should return the partial locking script (the part before op_return) of the contract', () => {
        const lsBeforeAddOpReturn = instance.lockingScript;

        assert.equal(instance.codePart.toASM(), lsBeforeAddOpReturn.toASM()); // without op_return data, they should be the same

        instance.opReturn = 'aa';
        const lsAfterAddOpReturn = instance.lockingScript; // locking script changed after adding op_return

        assert.equal(instance.codePart.toASM(), lsBeforeAddOpReturn.toASM());
        assert.equal(instance.codePart.toHex(), lsBeforeAddOpReturn.toHex());

        assert.equal(instance.codePart.toASM() + ' OP_RETURN aa', lsAfterAddOpReturn.toASM());
        assert.equal(instance.codePart.toHex() + '6a01aa', lsAfterAddOpReturn.toHex());
        
        assert.equal(instance.codePart.toASM(), `OP_1 40 00 51 b1 b2 ${toHex(pubKeyHash)} OP_7 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_8 OP_PICK OP_8 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP`);
        assert.equal(instance.codePart.toHex(), `5101400100015101b101b214${toHex(pubKeyHash)}5779a95179876958795879ac777777777777777777`);
      })
    })

    describe('.dataPart', () => {
      describe('when opReturn is unset', () => {
        it('should return undefined', () => {
          assert.isUndefined(instance.dataPart);
        })
      })

      describe('when opReturn is set', () => {
        it('should return the partial locking script (the part before op_return) of the contract', () => {
          instance.opReturn = 'aa';
          assert.equal(instance.dataPart.toASM(), 'aa');
          assert.equal(instance.dataPart.toHex(), '01aa');
        })
      })
    })

    describe('.lockingScript', () => {
      it('should return the whole locking script of the contract', () => {
        // when op_return is non-exist
        assert.equal(instance.lockingScript.toASM(), instance.codePart.toASM());
        assert.equal(instance.lockingScript.toHex(), instance.codePart.toHex());

        // when op_return is exist
        instance.opReturn = 'aa';
        assert.equal(instance.lockingScript.toASM(), instance.codePart.toASM() + ' OP_RETURN ' + instance.dataPart.toASM());
        assert.equal(instance.lockingScript.toHex(), instance.codePart.toHex() + '6a' + instance.dataPart.toHex());
      })
    })

    describe('verify()', () => {
      it('should return true if all arguments are correct', () => {
        // use param txContext as the context
        assert.isTrue(instance.verify(unlockingScriptASM, txContext));

        // use instance.txContxt as the context
        instance.txContext = txContext;
        assert.isTrue(instance.verify(unlockingScriptASM));
        instance.txContext = undefined;
      })

      it('should return false if param `unlockingScript` is incorrect', () => {
        assert.isFalse(instance.verify(unlockingScriptASM + '00', txContext));
      })

      it('should return false if param `txContext` is incorrect', () => {
        // emtpy txContext
        assert.isFalse(instance.verify(unlockingScriptASM));

        // incorrect inputSatoshis
        assert.isFalse(instance.verify(unlockingScriptASM, Object.assign({}, txContext, { inputSatoshis: inputSatoshis + 1 })));
      })
    })

    it("should have all public functions of the contract mapped to instance's methods", () => {
      assert.typeOf(instance.unlock, 'function');
    })

    describe("when the mapped-method being invoked", () => {

      it("should return FunctionCall type object which could be transformed to unlocking script", () => {
        const functionCall = instance.unlock(new Sig(toHex(sig)), new PubKey(toHex(publicKey)));
        assert.instanceOf(functionCall, FunctionCall);
        assert.equal(functionCall.toASM(), unlockingScriptASM);
        assert.equal(functionCall.toHex(), bsv.Script.fromASM(unlockingScriptASM).toHex());
      })

      it('the returned object can be verified whether it could unlock the contract', () => {
        // can unlock contract if params are correct
        const validSig = toHex(sig);
        const validPubkey = toHex(publicKey);
        assert.isTrue(instance.unlock(new Sig(validSig), new PubKey(validPubkey)).verify({ inputSatoshis, hex: toHex(tx) }));
        assert.isTrue(instance.unlock(new Sig(validSig), new PubKey(validPubkey)).verify({ inputSatoshis, tx }));

        // can not unlock contract if any param is incorrect
        const invalidSig = validSig.replace('1', '0');
        const invalidPubKey = validPubkey.replace('0', '1');
        assert.isFalse(instance.unlock(new Sig(invalidSig), new PubKey(validPubkey)).verify({ inputSatoshis, tx }));
        assert.isFalse(instance.unlock(new Sig(validSig), new PubKey(invalidPubKey)).verify({ inputSatoshis, tx }));
      })

    })

  })

})