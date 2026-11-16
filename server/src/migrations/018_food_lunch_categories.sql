ALTER TABLE food_menu
  ADD COLUMN IF NOT EXISTS lunch_category TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE food_menu
  DROP CONSTRAINT IF EXISTS food_menu_menu_date_meal_type_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'food_menu_lunch_category_check'
      AND conrelid = 'food_menu'::regclass
  ) THEN
    ALTER TABLE food_menu
      ADD CONSTRAINT food_menu_lunch_category_check
      CHECK (lunch_category IN ('normal', 'vegetarisch', 'dessert'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS food_menu_date_meal_category_unique
  ON food_menu (menu_date, meal_type, lunch_category);
