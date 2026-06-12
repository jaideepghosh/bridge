// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(serde::Deserialize, serde::Serialize)]
struct ProxyRequestInput {
    method: String,
    url: String,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>,
    #[serde(rename = "timeoutMs")]
    timeout_ms: Option<u64>,
}

#[derive(serde::Serialize)]
struct ProxyResponse {
    status: u16,
    #[serde(rename = "statusText")]
    status_text: String,
    headers: std::collections::HashMap<String, String>,
    body: String,
    #[serde(rename = "durationMs")]
    duration_ms: u64,
    size: usize,
    #[serde(rename = "contentType")]
    content_type: Option<String>,
}

#[derive(serde::Serialize, Clone)]
#[serde(tag = "type")]
enum StreamEvent {
    #[serde(rename = "headers")]
    Headers {
        status: u16,
        #[serde(rename = "statusText")]
        status_text: String,
        headers: std::collections::HashMap<String, String>,
    },
    #[serde(rename = "chunk")]
    Chunk {
        value: String,
    },
}

#[tauri::command]
async fn execute_request_stream(
    req: ProxyRequestInput,
    channel: tauri::ipc::Channel<StreamEvent>,
) -> Result<ProxyResponse, String> {
    let client = reqwest::Client::new();
    
    let mut builder = match req.method.to_uppercase().as_str() {
        "GET" => client.get(&req.url),
        "POST" => client.post(&req.url),
        "PUT" => client.put(&req.url),
        "DELETE" => client.delete(&req.url),
        "PATCH" => client.patch(&req.url),
        "HEAD" => client.head(&req.url),
        "OPTIONS" => client.request(reqwest::Method::OPTIONS, &req.url),
        _ => client.request(
            reqwest::Method::from_bytes(req.method.as_bytes())
                .unwrap_or(reqwest::Method::GET),
            &req.url,
        ),
    };

    if let Some(headers) = req.headers {
        for (k, v) in headers {
            if let Ok(header_name) = reqwest::header::HeaderName::from_bytes(k.as_bytes()) {
                if let Ok(header_value) = reqwest::header::HeaderValue::from_str(&v) {
                    builder = builder.header(header_name, header_value);
                }
            }
        }
    }

    if let Some(body_str) = req.body {
        builder = builder.body(body_str);
    }

    let timeout = std::time::Duration::from_millis(req.timeout_ms.unwrap_or(30000));
    builder = builder.timeout(timeout);

    let start_time = std::time::Instant::now();
    let response = builder.send().await.map_err(|e| e.to_string())?;

    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("")
        .to_string();

    let mut response_headers = std::collections::HashMap::new();
    for (k, v) in response.headers().iter() {
        if let Ok(val) = v.to_str() {
            response_headers.insert(k.to_string(), val.to_string());
        }
    }

    let content_type = response_headers.get("content-type").cloned();

    let _ = channel.send(StreamEvent::Headers {
        status,
        status_text: status_text.clone(),
        headers: response_headers.clone(),
    });

    use futures_util::StreamExt;
    let mut body_accumulated = String::new();
    let mut stream = response.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk).into_owned();
        body_accumulated.push_str(&text);
        
        let _ = channel.send(StreamEvent::Chunk {
            value: text,
        });
    }

    let final_duration_ms = start_time.elapsed().as_millis() as u64;
    let size = body_accumulated.len();

    Ok(ProxyResponse {
        status,
        status_text,
        headers: response_headers,
        body: body_accumulated,
        duration_ms: final_duration_ms,
        size,
        content_type,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![greet, execute_request_stream])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
