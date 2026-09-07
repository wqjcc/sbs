module.exports = async function handler(req, res) {
  // ✅所有跨域头写在最最前面
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检OPTIONS
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({success:false,error:"仅支持POST"});
  }

  const {USERNAME,PASSWORD,TARGET_STEP}=req.body;
  if(!USERNAME||!PASSWORD||!TARGET_STEP){
    return res.json({success:false,error:"参数缺失"});
  }

  try {
    const accessToken = await getAccessToken(USERNAME,PASSWORD);
    if(!accessToken) throw new Error("登录失败，获取access_token为空");
    const tokenData = await grantLoginTokens(accessToken);
    const appToken = tokenData.app_token;
    const devId = await getDeviceId(appToken);
    const result = await postStep(appToken,devId,Number(TARGET_STEP));
    return res.json({success:true,deviceId:devId,targetStep:TARGET_STEP,result});
  } catch(err){
    // 捕获所有异常，强制返回json，防止接口挂住
    return res.json({
      success:false,
      error:err?.message||String(err)
    })
  }
}

const axios = require('axios');
const CryptoJS = require('crypto-js');

const AES_KEY = CryptoJS.enc.Utf8.parse("2018070314235876");
const AES_IV = CryptoJS.enc.Utf8.parse("2018070314235876");

function aesEncrypt(text) {
    const srcs = CryptoJS.enc.Utf8.parse(text);
    const encrypted = CryptoJS.AES.encrypt(srcs, AES_KEY, {
        iv: AES_IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

async function getAccessToken(username, password) {
    const loginBody = JSON.stringify({
        phone: username,
        password: password,
        country_code: "CN"
    });
    const encryptBody = aesEncrypt(loginBody);
    try {
        await axios.post(
            "https://api-mifit-cn.huami.com/v1/user/login",
            { data: encryptBody },
            { headers: { "Content-Type": "application/json" }, maxRedirects: 0 }
        );
    } catch (e) {
        if (e.response && e.response.status === 303) {
            const loc = e.response.headers.location;
            const m = loc.match(/access_token=([^&]+)/);
            return m ? m[1] : null;
        }
        throw e;
    }
    return null;
}

async function grantLoginTokens(accessToken) {
    const res = await axios.get(`https://api-mifit-cn.huami.com/v1/user/grant?access_token=${accessToken}`);
    return res.data;
}

async function getDeviceId(appToken) {
    const res = await axios.get("https://api-mifit-cn.huami.com/v1/user/devices", { headers: { "app_token": appToken } });
    const dev = res.data.data[0];
    if (!dev) throw new Error("没有找到绑定设备");
    return dev.device_id;
}

async function postStep(appToken, deviceId, stepCount) {
    const dateStr = new Date().toISOString().split('T')[0];
    const dataJson = {
        "data": {
            "summary": {
                "steps": stepCount,
                "calories": Math.round(stepCount * 0.04),
                "distance": Math.round(stepCount * 0.0007),
                "active_time": Math.round(stepCount * 0.6)
            },
            "date": dateStr,
            "timezone": "Asia/Shanghai",
            "device_id": deviceId
        }
    };
    const res = await axios.post(
        "https://api-mifit-cn.huami.com/v1/data/band_data.json",
        { data_json: JSON.stringify(dataJson) },
        { headers: { "app_token": appToken } }
    );
    return res.data;
}
