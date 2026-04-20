import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def _find_accommodation(all_dests, lat, lng, max_distance=30):
    accommodation_keywords = ["hotel", "resort", "inn", "lodge", "villa", "guesthouse", "hostel", "rooms"]
    candidates = []
    
    for dest in all_dests:
        name_lower = dest.get("name", "").lower()
        desc_lower = dest.get("description", "").lower()
        is_accommodation = any(kw in name_lower or kw in desc_lower for kw in accommodation_keywords)
        
        if not is_accommodation:
            continue
            
        dist = haversine(lat, lng, dest["lat"], dest["lng"])
        if dist <= max_distance:
            candidates.append((dist, dest))
            
    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    return None

def build_daily_schedule(day_num, places_today, current_accommodation, all_dests, is_first_day=False):
    schedule = []
    
    if not places_today:
        return schedule, current_accommodation
        
    start_place = places_today[0]
    end_place = places_today[-1]
    
    # MORNING
    if current_accommodation:
        # Breakfast at accommodation
        acc_b = dict(current_accommodation)
        acc_b["title"] = f"Breakfast at {current_accommodation['name']}"
        acc_b["category"] = "food"
        acc_b["image_url"] = "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80" # Breakfast image
        acc_b["day"] = day_num
        schedule.append(acc_b)
    elif is_first_day:
        b_place = dict(start_place)
        b_place["title"] = f"Breakfast near {start_place['name']}"
        b_place["category"] = "food"
        b_place["image_url"] = "https://images.unsplash.com/photo-1525648199074-cee30ba79a4a?w=800&q=80"
        b_place["day"] = day_num
        schedule.append(b_place)

    # MID-DAY
    mid_index = max(1, len(places_today) // 2)
    
    for i, place in enumerate(places_today):
        p = dict(place)
        p["day"] = day_num
        if "category" not in p or p["category"] != "accommodation":
            schedule.append(p)
            
        if i == mid_index - 1:
            # LUNCH
            lunch = dict(place)
            lunch["title"] = f"Lunch break near {place['name']}"
            lunch["category"] = "food"
            lunch["image_url"] = "https://images.unsplash.com/photo-1564671165093-20688ff1fffa?w=800&q=80" # Sri lankan lunch
            lunch["day"] = day_num
            schedule.append(lunch)
            
    # END OF DAY
    dist_to_current = float("inf")
    if current_accommodation:
        dist_to_current = haversine(end_place["lat"], end_place["lng"], current_accommodation["lat"], current_accommodation["lng"])
        
    if not current_accommodation or dist_to_current > 20:
        new_acc = _find_accommodation(all_dests, end_place["lat"], end_place["lng"])
        if new_acc:
            current_accommodation = new_acc
            
        # Dinner out
        dinner = dict(end_place)
        dinner["title"] = f"Dinner near {end_place['name']}"
        dinner["category"] = "food"
        dinner["image_url"] = "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80"
        dinner["day"] = day_num
        schedule.append(dinner)
        
        # Check-in
        if current_accommodation:
            acc_c = dict(current_accommodation)
            acc_c["title"] = f"Check-in at {current_accommodation['name']}"
            acc_c["category"] = "accommodation"
            acc_c["day"] = day_num
            schedule.append(acc_c)
    else:
        # Return to existing acc
        transit = dict(current_accommodation)
        transit["title"] = f"Return to {current_accommodation['name']}"
        transit["category"] = "transport"
        transit["day"] = day_num
        schedule.append(transit)
        
        dinner = dict(current_accommodation)
        dinner["title"] = f"Dinner at {current_accommodation['name']}"
        dinner["category"] = "food"
        dinner["image_url"] = "https://images.unsplash.com/photo-1544148103-0773bf10d330?w=800&q=80"
        dinner["day"] = day_num
        schedule.append(dinner)
        
    return schedule, current_accommodation

# Mock test
all_dests = [
    {"name": "Hotel Mirissa", "description": "luxury hotel", "lat": 5.95, "lng": 80.45},
    {"name": "Hotel Kandy", "description": "nice hotel", "lat": 7.29, "lng": 80.63},
]
places1 = [{"name": "Mirissa Beach", "lat": 5.94, "lng": 80.46}]
s1, acc = build_daily_schedule(1, places1, None, all_dests, True)
print("Day 1 Plan:")
for x in s1: print(x['title'])

places2 = [{"name": "Coconut Tree Hill", "lat": 5.945, "lng": 80.465}]
s2, acc = build_daily_schedule(2, places2, acc, all_dests)
print("\nDay 2 Plan:")
for x in s2: print(x['title'])

places3 = [{"name": "Temple of Tooth", "lat": 7.29, "lng": 80.63}]
s3, acc = build_daily_schedule(3, places3, acc, all_dests)
print("\nDay 3 Plan:")
for x in s3: print(x['title'])
