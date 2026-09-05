use sha2::{Digest, Sha256};
use std::collections::HashSet;
use crate::rag::tokenize;

pub fn normalize_content_for_storage(content: &str) -> String {
    content
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

pub fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn legacy_hash_marker() -> &'static str {
    "legacy-unhashed"
}

pub fn token_count(content: &str) -> usize {
    content.split_whitespace().count()
}

pub fn truncate_chars(content: &str, max_chars: usize) -> String {
    let mut output = String::new();
    for character in content.chars().take(max_chars) {
        output.push(character);
    }
    if content.chars().count() > max_chars {
        output.push_str("...");
    }
    output
}

pub fn vector_to_blob(vector: &[f32]) -> Vec<u8> {
    vector
        .iter()
        .flat_map(|value| value.to_le_bytes())
        .collect::<Vec<_>>()
}

pub fn blob_to_vector(blob: &[u8]) -> Result<Vec<f32>, String> {
    if blob.len() % std::mem::size_of::<f32>() != 0 || blob.is_empty() {
        return Err("Stored vector has invalid byte length".to_string());
    }
    Ok(blob
        .chunks_exact(std::mem::size_of::<f32>())
        .map(|bytes| f32::from_le_bytes(bytes.try_into().unwrap()))
        .collect())
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(left, right)| left * right).sum();
    let norm_a: f32 = a.iter().map(|val| val * val).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|val| val * val).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

pub fn unique_tokens(content: &str) -> Vec<String> {
    let mut seen = HashSet::new();
    tokenize(content)
        .into_iter()
        .filter(|token| seen.insert(token.clone()))
        .collect()
}
