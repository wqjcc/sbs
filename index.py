from flask import Flask, request, jsonify
import sys
sys.path.append("./")
from util.zepp_helper import ZeppHelper

app = Flask(__name__)

@app.before_request
def cors_handler():
    # 跨域处理
    if request.method == "OPTIONS":
        headers = {
            "Access‑Control‑Allow‑Origin": "*",
            "Access‑Control‑Allow‑Methods": "OPTIONS,POST",
            "Access‑Control‑Allow‑Headers": "Content‑Type"
        }
        return ("",200,headers)

@app.route("/api/step", methods=["POST"])
def set_step():
    resp_headers = {
        "Access‑Control‑Allow‑Origin":"*"
    }
    payload = request.get_json()
    username = payload.get("USERNAME")
    password = payload.get("PASSWORD")
    target_step = payload.get("TARGET_STEP")

    if not (username and password and target_step):
        return jsonify({"success":False,"error":"参数缺失 USERNAME,PASSWORD,TARGET_STEP"}),200,resp_headers

    try:
        helper = ZeppHelper(username, password)
        # 登录
        helper.login()
        # 获取设备
        device = helper.get_device()
        device_id = device["deviceId"]
        # 直接使用传入固定步数，关闭随机步数
        result = helper.modify_step(device_id, int(target_step))
        return jsonify({
            "success":True,
            "deviceId":device_id,
            "result":result
        }),200,resp_headers
    except Exception as e:
        return jsonify({
            "success":False,
            "error":str(e)
        }),200,resp_headers

# vercel python serverless需要暴露app
if __name__ == "__main__":
    app.run()
