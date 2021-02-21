
import { assert, expect } from 'chai';
import { newTx, loadDescription } from './helper';
import { DebugLaunch } from '../src/abi';
import { buildContractClass, VerifyError, buildTypeClasses } from '../src/contract';
import { bsv, toHex, signTx, compileContract, num2bin, getPreimage, uri2path } from '../src/utils';
import { Bytes, PubKey, Sig, Ripemd160, Bool, Struct, SigHashPreimage } from '../src/scryptTypes';
import { readFileSync } from 'fs';


const jsonDescr = loadDescription('mixedstruct_desc.json');
const MixedStruct = buildContractClass(jsonDescr);
const { Block, Person, Token, Bsver } = buildTypeClasses(jsonDescr);



describe('MixedStruct  test', () => {

  describe('check MixedStruct', () => {
    let mixedStruct, result;

    before(() => {
      mixedStruct = new MixedStruct(new Bsver({
        name: new Bytes('6666'),
        friend: new Person({
          name: new Bytes('7361746f736869206e616b616d6f746f'),
          addr: new Bytes('6666'),
          isMale: true,
          age: 33,
          blk: new Block({
            time: 10000,
            hash: new Bytes('68656c6c6f20776f726c6421'),
            header: new Bytes('1156'),
          })
        }),
        tokens: [new Token({
          id: new Bytes('0001'),
          createTime: 1000000
        }), new Token({
          id: new Bytes('0002'),
          createTime: 1000001
        }), new Token({
          id: new Bytes('0003'),
          createTime: 1000002
        })]
      }));

    });



    it('should success when call unlock', () => {
      result = mixedStruct.unlock(new Person({
        name: new Bytes('7361746f736869206e616b616d6f746f'),
        addr: new Bytes('68656c6c6f20776f726c6421'),
        isMale: true,
        age: 33,
        blk: new Block({
          time: 10000,
          hash: new Bytes('68656c6c6f20776f726c6420'),
          header: new Bytes('1156'),
        })
      })).verify()
      expect(result.success, result.error).to.be.true
    });

  });
});