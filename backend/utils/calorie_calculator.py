"""
Calorie calculator using Mifflin-St Jeor formula for accurate BMR and TDEE calculation
"""

from enum import Enum
from datetime import datetime

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"

class GoalType(str, Enum):
    lose_weight = "lose_weight"
    maintain_weight = "maintain_weight"
    gain_weight = "gain_weight"

def get_age_from_birth_year(birth_year: int) -> int:
    """
    Calculate current age from birth year
    
    Args:
        birth_year: Year of birth
    
    Returns:
        Current age in years
    """
    current_year = datetime.now().year
    age = current_year - birth_year
    return age

def calculate_bmr(weight_kg: float, height_cm: float, birth_year: int, gender: Gender) -> float:
    """
    Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor formula
    
    Formula:
    - For males: BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
    - For females: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
    - For other: Average of male and female
    
    Args:
        weight_kg: Body weight in kilograms
        height_cm: Height in centimeters
        birth_year: Year of birth
        gender: Gender (male, female, other)
    
    Returns:
        BMR in kcal/day
    """
    age = get_age_from_birth_year(birth_year)
    base_bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    
    if gender == Gender.male:
        bmr = base_bmr + 5
    elif gender == Gender.female:
        bmr = base_bmr - 161
    else:  # other
        # Average of male and female
        bmr_male = base_bmr + 5
        bmr_female = base_bmr - 161
        bmr = (bmr_male + bmr_female) / 2
    
    return round(bmr, 1)

def calculate_tdee(bmr: float, activity_level: float = 1.5) -> float:
    """
    Calculate Total Daily Energy Expenditure (TDEE)
    
    Activity levels:
    - 1.2: Sedentary (little to no exercise)
    - 1.375: Lightly active (light exercise 1-3 days/week)
    - 1.55: Moderately active (moderate exercise 3-5 days/week)
    - 1.725: Very active (heavy exercise 6-7 days/week)
    - 1.9: Extremely active (physical job or intense training 2x/day)
    
    Args:
        bmr: Basal Metabolic Rate
        activity_level: Activity level multiplier (default 1.5 for average)
    
    Returns:
        TDEE in kcal/day
    """
    return round(bmr * activity_level)

def calculate_daily_calories(
    weight_kg: float,
    height_cm: float,
    birth_year: int,
    gender: Gender,
    goal_type: GoalType,
    activity_level: float = 1.5
) -> int:
    """
    Calculate daily calorie target based on weight loss/gain goals
    
    Args:
        weight_kg: Body weight in kilograms
        height_cm: Height in centimeters
        birth_year: Year of birth
        gender: Gender (male, female, other)
        goal_type: Goal type (lose_weight, maintain_weight, gain_weight)
        activity_level: Activity level multiplier (default 1.5)
    
    Returns:
        Recommended daily calorie intake
    """
    bmr = calculate_bmr(weight_kg, height_cm, birth_year, gender)
    tdee = calculate_tdee(bmr, activity_level)
    
    # Apply goal adjustments
    if goal_type == GoalType.lose_weight:
        # 500 kcal deficit per day = 0.5 kg loss per week
        daily_calories = tdee - 500
    elif goal_type == GoalType.maintain_weight:
        # Maintain current weight
        daily_calories = tdee
    else:  # gain_weight
        # 500 kcal surplus per day = 0.5 kg gain per week
        daily_calories = tdee + 500
    
    # Ensure minimum calorie intake (generally 1200 kcal for women, 1500 for men)
    if gender == Gender.female:
        daily_calories = max(1200, daily_calories)
    else:
        daily_calories = max(1500, daily_calories)
    
    return int(daily_calories)

# Example usage and testing
if __name__ == "__main__":
    # Test case: 70kg male, 175cm, 25 years old, moderate activity
    weight = 70
    height = 175
    age = 25
    gender = Gender.male
    activity = 1.55
    
    bmr = calculate_bmr(weight, height, age, gender)
    tdee = calculate_tdee(bmr, activity)
    
    print(f"BMR: {bmr} kcal/day")
    print(f"TDEE: {tdee} kcal/day")
    print(f"Maintain: {calculate_daily_calories(weight, height, age, gender, GoalType.maintain_weight, activity)} kcal/day")
    print(f"Lose weight: {calculate_daily_calories(weight, height, age, gender, GoalType.lose_weight, activity)} kcal/day")
    print(f"Gain weight: {calculate_daily_calories(weight, height, age, gender, GoalType.gain_weight, activity)} kcal/day")
