// *** YOU ARE LIMITED TO THE FOLLOWING IMPORTS TO BUILD YOUR PHAT CONTRACT     ***
// *** ADDING ANY IMPORTS WILL RESULT IN ERRORS & UPLOADING YOUR CODE TO PHALA  ***
// *** NETWORK WILL FAIL. IF YOU WANT TO KNOW MORE, JOIN OUR DISCORD TO SPEAK   ***
// *** WITH THE PHALA TEAM AT https://discord.gg/5HfmWQNX THANK YOU             ***
import "@phala/pink-env";
import { Coders } from "@phala/ethers";

type HexString = `0x${string}`

// ETH ABI Coders available
/*
// Basic Types
// Encode uint
const uintCoder = new Coders.NumberCoder(32, false, "uint256");
// Encode Bytes
const bytesCoder = new Coders.BytesCoder("bytes");
// Encode String
const stringCoder = new Coders.StringCoder("string");
// Encode Address
const addressCoder = new Coders.AddressCoder("address");

// ARRAYS
//
// ***NOTE***
// IF YOU DEFINE AN TYPED ARRAY FOR ENCODING, YOU MUST ALSO DEFINE THE SIZE WHEN DECODING THE ACTION REPLY IN YOUR
// SOLIDITY SMART CONTRACT.
// EXAMPLE for an array of string with a length of 10
//
// index.ts
const stringCoder = new Coders.StringCoder("string");
const stringArrayCoder = new Coders.ArrayCoder(stringCoder, 10, "string[]");
function encodeReply(reply: [number, number, string[]]): HexString {
  return Coders.encode([uintCoder, uintCoder, stringArrayCoder], reply) as HexString;
}

const stringArray = string[10];

export default function main(request: HexString, secrets: string): HexString {
  return encodeReply([0, 1, stringArray]);
}
// OracleConsumerContract.sol
function _onMessageReceived(bytes calldata action) internal override {
    (uint respType, uint id, string[10] memory data) = abi.decode(
        action,
        (uint, uint, string[10])
    );
}
// Encode Array of addresses with a length of 10
const stringArrayCoder = new Coders.ArrayCoder(stringCoder, 10, "string");
// Encode Array of addresses with a length of 10
const addressArrayCoder = new Coders.ArrayCoder(addressCoder, 10, "address");
// Encode Array of bytes with a length of 10
const bytesArrayCoder = new Coders.ArrayCoder(bytesCoder, 10, "bytes");
// Encode Array of uint with a length of 10
const uintArrayCoder = new Coders.ArrayCoder(uintCoder, 10, "uint256");
*/

const uintCoder = new Coders.NumberCoder(32, false, "uint256");
const bytesCoder = new Coders.BytesCoder("bytes");
const addressCoder = new Coders.AddressCoder("address");
const addressesCoder = new Coders.ArrayCoder(addressCoder, -1, "address[]");


// data format: (uint respType, uint id, uint errno, address[] memory data)
function encodeReply(reply: [number, number, number, string[]]): HexString {
  return Coders.encode([uintCoder, uintCoder, uintCoder, addressesCoder], reply) as HexString;
}

type Secrets = {
  // Huddle01 api key from https://huddle01.com/docs/api-keys
  apiKey?: string
};

// Defined in OracleConsumerContract.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;

enum Error {
  BadRequestString = "BadRequestString",
  FailedToFetchData = "FailedToFetchData",
  FailedToDecode = "FailedToDecode",
  MalformedRequest = "MalformedRequest",
  ApiKeyNotFound = "ApiKeyNotFound",
}

function errorToCode(error: Error): number {
  switch (error) {
    case Error.BadRequestString:
      return 1;
    case Error.FailedToFetchData:
      return 2;
    case Error.FailedToDecode:
      return 3;
    case Error.MalformedRequest:
      return 4;
    case Error.ApiKeyNotFound:
      return 5;
    default:
      return 0;
  }
}

function isHexString(str: string): boolean {
  const regex = /^0x[0-9a-f]+$/;
  return regex.test(str.toLowerCase());
}

function stringToHex(str: string): string {
  var hex = "";
  for (var i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return "0x" + hex;
}

function fetchParticipants(meetingId: string, apiKey: string): any {
  let headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };
  let url = `https://api.huddle01.com/api/v1/rooms/paticipant-list?meetingId=${meetingId}`;
  //
  // In Phat Contract runtime, we not support async/await, you need use `pink.batchHttpRequest` to
  // send http request. The Phat Contract will return an array of response.
  //
  let response = pink.batchHttpRequest(
    [
      {
        url,
        method: "GET",
        headers,
        returnTextBody: true,
      },
    ],
    10000 // Param for timeout in milliseconds. Your Phat Contract script has a timeout of 10 seconds
  )[0]; // Notice the [0]. This is important bc the `pink.batchHttpRequest` function expects an array of up to 5 HTTP requests.
  if (response.statusCode !== 200) {
    console.log(
      `Fail to read Huddle01 api with status code: ${response.statusCode}, error: ${response.error || response.body
      }}`
    );
    throw Error.FailedToFetchData;
  }
  let respBody = response.body;
  if (typeof respBody !== "string") {
    throw Error.FailedToDecode;
  }
  return JSON.parse(respBody);
}

function mockFetchParticipants(): any {
  return {
    "roomId": "emo-orrj-uvh",
    "hostWalletAddress": [],
    "duration": 244,
    "participants": [
      {
        "displayName": "Phala1",
        "walletAddress": "0xD0fE316B9f01A3b5fd6790F88C2D53739F80B464"
      },
      {
        "displayName": "Phala2",
        "walletAddress": "0x32ba037C90BDF3Ef7Afb3C76F24A070f7778eEE1"
      },
      {
        "displayName": "Jane Doe",
        "walletAddress": null
      }
    ]
  };
}

function parseReqStr(hexStr: string): string {
  var hex = hexStr.toString();
  if (!isHexString(hex)) {
    throw Error.BadRequestString;
  }
  hex = hex.slice(2);
  var str = "";
  for (var i = 0; i < hex.length; i += 2) {
    const ch = String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
    str += ch;
  }
  return str;
}


//
// Here is what you need to implemented for Phat Contract, you can customize your logic with
// JavaScript here.
//
// The Phat Contract will be called with two parameters:
//
// - request: The raw payload from the contract call `request` (check the `request` function in TestLensApiConsumerConract.sol).
//            In this example, it's a tuple of two elements: [requestId, profileId]
// - secrets: The custom secrets you set with the `config_core` function of the Action Offchain Rollup Phat Contract. In
//            this example, it just a simple text of the lens api url prefix. For more information on secrets, checkout the SECRETS.md file.
//
// Your returns value MUST be a hex string, and it will send to your contract directly. Check the `_onMessageReceived` function in
// OracleConsumerContract.sol for more details. We suggest a tuple of three elements: [successOrNotFlag, requestId, data] as
// the return value.
//
export default function main(request: HexString, secrets: string): HexString {
  console.log(`handle req: ${request}`);
  // Uncomment to debug the `settings` passed in from the Phat Contract UI configuration.
  // console.log(`secrets: ${settings}`);
  let requestId, encodedReqStr;
  try {
    [requestId, encodedReqStr] = Coders.decode([uintCoder, bytesCoder], request);
  } catch (error) {
    console.info("Malformed request received");
    return encodeReply([TYPE_ERROR, 0, errorToCode(error as Error), []]);
  }
  const parsedHexReqStr = parseReqStr(encodedReqStr as string);
  console.log(`Request received for meeting ${parsedHexReqStr}`);

  const parsedSecrets = JSON.parse(secrets) as Secrets;
  if (parsedSecrets.apiKey === undefined) {
    throw Error.ApiKeyNotFound;
  }

  try {
    // const respData = fetchParticipants(parsedHexReqStr, parsedSecrets.apiKey);
    const respData = mockFetchParticipants();
    let participants = []
    for (var p of respData.participants) {
      if (p.walletAddress) participants.push(p.walletAddress);
    }
    console.log("response:", [TYPE_RESPONSE, requestId, participants]);
    return encodeReply([TYPE_RESPONSE, requestId, 0, participants]);
  } catch (error) {
    if (error === Error.FailedToFetchData) {
      throw error;
    } else {
      // otherwise tell client we cannot process it
      console.log("error:", [TYPE_ERROR, requestId, error]);
      return encodeReply([TYPE_ERROR, requestId, errorToCode(error as Error), []]);
    }
  }
}
