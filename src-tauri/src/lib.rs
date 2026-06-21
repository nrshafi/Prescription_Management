use std::sync::Mutex;

use tauri::Manager;

mod commands;
mod db;
mod migrations;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .setup(|app| {
            let conn = db::init_database(app.handle()).map_err(std::io::Error::other)?;
            app.manage(db::Db(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::dashboard::dashboard_stats,
            commands::patients::patients_list,
            commands::patients::patients_visits,
            commands::patients::patients_create,
            commands::patients::patients_update,
            commands::patients::patients_delete,
            commands::patients::patients_prescription_count,
            commands::prescriptions::prescriptions_list,
            commands::prescriptions::prescriptions_get,
            commands::prescriptions::prescriptions_create,
            commands::prescriptions::prescriptions_update,
            commands::prescriptions::prescriptions_duplicate,
            commands::prescriptions::prescriptions_medicine_suggestions,
            commands::presets::presets_list,
            commands::presets::presets_create,
            commands::presets::presets_update,
            commands::presets::presets_delete,
            commands::settings::settings_get,
            commands::settings::settings_update_doctor_profile,
            commands::settings::settings_update_paper_settings,
            commands::settings::backup::settings_export_backup,
            commands::settings::backup::settings_import_backup,
            commands::settings::json_io::settings_export_json,
            commands::settings::json_io::settings_import_json,
            commands::printing::printing_data,
            commands::printing::printing_preview,
            commands::printing::printing_print,
            commands::printing::printing_pdf
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
