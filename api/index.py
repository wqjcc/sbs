import sys
import json
sys.path.append("./")
from util.zepp_helper import ZeppHelper

def handler(event, context):
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json; charset=utf-8"
    }

    http_method = event.get("httpMethod")

    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({})
        }

    if http_method != "POST":
        return {
            "statusCode": 405,
            "headers": headers,
            "body": json.dumps({"success": False, "error": "仅支持POST请求"})
        }

    try:
        body_raw = event.get("body", "{}")
        payload = json.loads(body_raw)
    except Exception as err:
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"success": False, "error": f"JSON解析失败:{str(err)}"})
        }

    username = payload.get("USERNAME")
    password = payload.get("PASSWORD")
    target_step = payload.get("TARGET_STEP")

    if not username or not password or target_step is None:
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps({"success": False, "error": "缺少参数 USERNAME / PASSWORD / TARGET_STEP"})
        }

    try:
        helper = ZeppHelper(username, password)
        helper.login()
        device_info = helper.get_device()
        dev_id = device_info["deviceId"]
        ret = helper.modify_step(dev_id, int(target_step))
        resp_data = {
            "success": True,
            "deviceId": dev_id,
            "result": ret
        }
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(resp_data, ensure_ascii=False)
        }
    except Exception as e:
        resp_data = {
            "success": False,
            "error": str(e)
        }
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(resp_data, ensure_ascii=False)
        }
