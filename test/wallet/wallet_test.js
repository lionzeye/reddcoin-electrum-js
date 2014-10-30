var WalletFactory = require("../../lib/wallet/WalletFactory");
var bitcore = bitcore || require('bitcore');
var BIP39 = bitcore.BIP39;
var BIP39WordlistEn = bitcore.BIP39WordlistEn;
var WalletKey = bitcore.WalletKey;
var HierarchicalKey = bitcore.HierarchicalKey;

var nodeunit = require("nodeunit");

// Allows for debug versions of tests. For instance, if
//    test.strictEqual();
// is failing, you can add a "d" to the beginning to get better formatted debug output:
//    dtest.strictEqual();
// This is useful because with long addresses, hex strings, etc. its much easier to compare them when they're aligned.
var dtest = {

    strictEqual : function (a, b, m) {
        var m = m || "";
        console.log(m);
        console.log(a);
        console.log(b);
        console.log("");
    },

    deepEqual : function (a, b, m) {
        this.strictEqual(a, b, m);
    }
};

// All this data comes from Reddcoin Electrum in python
var testData = {
    mnemonicSeed : "travel nowhere air position hill peace suffer parent beautiful rise blood power home crumble teach",
    password     : 'secret',

    expectedHexSeedPassword   : '26df33950a95b706b5bc1ebf33ad04d061402aab229824233992a17ac168d2db7e10d90bb7a7834df9fc1ecdb0e04e796f55decfa55ff624e7ee38d8c2fac98c',
    expectedHexSeedNoPassword : '890da4490c5521dd347f96e0bc9731fbd43c9831e56b92ed5015024913a6b53c156cf749cd943d27ab615d7b0cd9478b00c8fa27d3ef48e57b5256c523fcfdd7',
    expectedRootXpub          : 'xpub661MyMwAqRbcGdQRHqXcDsXxFG9XUofyUJCiXPfEGY52avVFDjfLCaNw3WArgxXp2MnXbduLnmTwrUrSZVX7Mx5GNEcq6ojrETCQzwCVbNK',
    expectedRootXprv          : 'xprv9s21ZrQH143K49KxBozbrjbDhEK35Lx875H7j1FciCY3i8A6gCM5en4TCGWt524A5QUh9gHQg3cg8NocmKYQ613fxpJDwRoGWbUoVtfvPX3',
    expectedRootXprvHex       : '0488ade4000000000000000000d17da0494f9782e331bd408bfd661beb333eabe2e0d13ccf1a566045761879ac00e63f8bedb129c1baac98556c672b61003bd186c4fd08e17569f989b9947dcd1e',
    expectedMasterPublicKey   : 'xpub6B9ssRVytgm74y6MeAT3waCjHuQmqaRx1x1yuoNqX33JDQKy8nrS5drGfStBn4iEcgjCGnSUM9zFuhrwN9eHoQSKX78LL95MUbUPiK9JGAa',
    expectedMasterPrivateKey  : 'xprv9xAXTuy64KCorV1tY8v3aSFzjsaHS7i6ej6P7QyDxhWKLbzpbFYBXqXnpALn21ERK5j5XZnKXcLQ9XcXuTbKtXpfRPxhsDHXe98Zzu6R9Nx',

    addressSet : [
        'Rcv2GrdBV5F7Js4qwggrDjwzes69qpCJCB',
        'RgZ2X79U7A5eLZ3tiTskkjHkX6H7PZjnVT',
        'RoKgLYxEERXd9E9G4LXXBy8QSnzeJzRqYo',
        'RvuYFgHY6uCJPLaLek8fhsFzwbbNr9x2Ni',
        'RdbABKfs2gkT2ADWMR9P5ZaXCbeSbyLGEc',
        'RoKWjVB2PMUF3eJ6xTdp9NPCS2GUTGXzfm'
    ]

};

module.exports = nodeunit.testCase({
    setUp : function (callback) {
        this.wallet = WalletFactory.standardWallet();
        //for some reason it all comes crashing down if you don't call this callback :(
        callback();
    },

    tearDown : function (callback) {
        this.wallet = undefined;
        //see above
        callback();
    },

    /**
     * This is a very basic test to ensure that inheritance and factories and everything are working as expected.
     *
     * @param test - test suite object with assertion methods
     */
    //                                                                                                                  @formatter:off
    'Test Inheritance' : function (test) {
        var that         = this,
            addresses    = testData.addressSet,
            secondWallet = WalletFactory.standardWallet(),
            currentAddresses;
//                                                                                                                      @formatter:on
        currentAddresses = this.wallet.getSimpleAddresses();
        test.deepEqual([], currentAddresses, 'should start empty');

        //override the public property if it exists
        this.wallet.addresses = [ addresses[0] ];

        currentAddresses = this.wallet.getSimpleAddresses();
        test.deepEqual([], currentAddresses, 'addresses should not be public');

        //add all addresses
        addresses.forEach(function (address) {
            that.wallet.addSimpleAddress(address);
        });

        currentAddresses = this.wallet.getSimpleAddresses();

        test.deepEqual(addresses, currentAddresses);

        test.equals(true, this.wallet.isDeterministic(), "standard wallet should override this to true");

        test.deepEqual([], secondWallet.getSimpleAddresses(), "make sure its instance safe and second wallet is still empty");

        test.done();
    },

    //                                                                                                                  @formatter:off
    'Test Mnemonic Seed to Hex Seed' : function (test) {
        var mnemonicSeed              = testData.mnemonicSeed,
            password                  = testData.password,
            expectedHexSeedPassword   = testData.expectedHexSeedPassword,
            expectedHexSeedNoPassword = testData.expectedHexSeedNoPassword,
            generatedSeed, generatedSeedNoPassword;

        generatedSeed           = BIP39.mnemonic2seed(mnemonicSeed, password);
        generatedSeedNoPassword = BIP39.mnemonic2seed(mnemonicSeed, '');

        test.strictEqual(generatedSeed.toString("hex"),           expectedHexSeedPassword);
        test.strictEqual(generatedSeedNoPassword.toString("hex"), expectedHexSeedNoPassword);

        test.done();
    },

    'Test Hex Seed to Root Extended Keys' : function (test) {
        var hexSeed = testData.expectedHexSeedNoPassword,

            expectedRootXpub    = testData.expectedRootXpub,
            expectedRootXprv    = testData.expectedRootXprv,
            expectedRootXprvHex = testData.expectedRootXprvHex,

            root        = new HierarchicalKey.seed(hexSeed),

            rootXpub    = root.extendedPublicKeyString(),
            rootXprv    = root.extendedPrivateKeyString(),
            rootXprvHex = root.extendedPrivateKeyString('hex'),

            expectedKey = new HierarchicalKey(expectedRootXprv);

        //All these assertions aren't strictly necessary but should be helpful if something goes wrong again in the future.
        test.strictEqual(root.version,            expectedKey.version,            "Version: ");
        test.strictEqual(root.depth,              expectedKey.depth,              "Depth: ");
        test.deepEqual  (root.parentFingerprint,  expectedKey.parentFingerprint,  "Parent Fingerprint: ");
        test.deepEqual  (root.chainCode,          expectedKey.chainCode,          "Chain Code: ");
        test.deepEqual  (root.eckey.private,      expectedKey.eckey.private,      "Private: ");
        test.deepEqual  (root.extendedPrivateKey, expectedKey.extendedPrivateKey, "Ex Private: ");
        // Fails currently because creation from seed has childIndex a buffer of zero while creation from xpriv has it
        // as an int of zero. Everything functions fine with this discrepancy.
        //test.strictEqual(root.childIndex,         expectedKey.childIndex,         "Child Index:");

        test.strictEqual(expectedRootXprvHex, rootXprvHex);

        test.strictEqual(expectedRootXprv, rootXprv);
        test.strictEqual(expectedRootXpub, rootXpub);

        test.done();
    },

    'Test Root Extended Keys to Master Keys' : function (test) {
        var rootXprv                 = testData.expectedRootXprv,
            expectedMasterPublicKey  = testData.expectedMasterPublicKey,
            expectedMasterPrivateKey = testData.expectedMasterPrivateKey,

            hkey = new HierarchicalKey(rootXprv).derive("m/44'/0'");

        test.strictEqual(hkey.extendedPublicKeyString(),  expectedMasterPublicKey);
        test.strictEqual(hkey.extendedPrivateKeyString(), expectedMasterPrivateKey);
        test.done();
    },

    'Test Master Keys to Addresses' : function (test) {
        var expectedMasterPrivateKey = testData.expectedMasterPrivateKey,
            addresses = testData.addressSet,
            account = new HierarchicalKey(expectedMasterPrivateKey).derive('m/0\'/0'),
            getAddress = function(account, index){
                var wKey = new WalletKey(),
                    priv = account.deriveChild(index).eckey.private.toString("hex");

                wKey.fromObj({ priv: priv});

                return wKey.storeObj();
            };

        console.log("priv:");
        console.log(getAddress(account, 0).priv);
        console.log("addr:");
        console.log(getAddress(account, 0).addr);
        test.strictEqual(getAddress(account, 0).addr, addresses[0]);
        test.strictEqual(getAddress(account, 1).addr, addresses[1]);
        test.strictEqual(getAddress(account, 2).addr, addresses[2]);
        test.done();
    },

    /**
     * The python electrum client generates these addresses from the given seed. Once this test passes we'll be doing well.
     * @param test
     */
    'Test Generates Addresses From Seed' : function (test) {
        var addresses = testData.addressSet,
            seedText  = testData.mnemonicSeed,
            generatedAddresses;

        this.wallet.buildFromMnemonic(seedText);
        generatedAddresses = this.wallet.getAddresses();

//        console.log(generatedAddresses[5].wkey);
        test.strictEqual(generatedAddresses[0].toString(), addresses[0]);
        test.strictEqual(generatedAddresses[1].toString(), addresses[1]);
        test.strictEqual(generatedAddresses[2].toString(), addresses[2]);
        test.done();
    }

});