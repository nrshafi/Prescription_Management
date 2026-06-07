UPDATE prescription_sections SET section_type = 'Provisional Diagnosis' WHERE section_type = 'Probational Diagnosis';
--> statement-breakpoint
UPDATE presets SET category = 'Provisional Diagnosis' WHERE category = 'Probational Diagnosis';