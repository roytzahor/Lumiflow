export type CategoryDetectionResult = {
    name: string;
    icon: string;
};

const dictionary: Record<string, CategoryDetectionResult> = {
    // Housing
    'שכר דירה': { name: 'מגורים', icon: '🏠' },
    'שכ״ד': { name: 'מגורים', icon: '🏠' },
    'משכנתא': { name: 'מגורים', icon: '🏠' },
    'ועד בית': { name: 'מגורים', icon: '🏢' },
    'ארנונה': { name: 'מגורים', icon: '🏙️' },

    // Food & Groceries
    'סופר': { name: 'סופר', icon: '🛒' },
    'מכולת': { name: 'סופר', icon: '🛒' },
    'אוכל': { name: 'אוכל', icon: '🍕' },
    'מסעדה': { name: 'אוכל', icon: '🍽️' },
    'וולט': { name: 'אוכל', icon: '🛵' },
    'Wolt': { name: 'אוכל', icon: '🛵' },
    'תן ביס': { name: 'אוכל', icon: '💳' },
    'קפה': { name: 'אוכל', icon: '☕' },
    'מאפיה': { name: 'אוכל', icon: '🥐' },
    'פיצה': { name: 'אוכל', icon: '🍕' },
    'בורגר': { name: 'אוכל', icon: '🍔' },
    'סושי': { name: 'אוכל', icon: '🍣' },

    // Utilities & Bills
    'חשמל': { name: 'חשבונות', icon: '⚡' },
    'מים': { name: 'חשבונות', icon: '💧' },
    'גז': { name: 'חשבונות', icon: '🔥' },
    'אינטרנט': { name: 'חשבונות', icon: '🌐' },
    'סלקום': { name: 'חשבונות', icon: '📱' },
    'פרטנר': { name: 'חשבונות', icon: '📱' },
    'פלאפון': { name: 'חשבונות', icon: '📱' },
    'הוט': { name: 'חשבונות', icon: '📺' },
    'יס': { name: 'חשבונות', icon: '📺' },
    'נטפליקס': { name: 'חשבונות', icon: '🍿' },
    'ספוטיפיי': { name: 'חשבונות', icon: '🎵' },

    // Transportation
    'דלק': { name: 'תחבורה', icon: '⛽' },
    'פנגו': { name: 'תחבורה', icon: '🅿️' },
    'חניה': { name: 'תחבורה', icon: '🅿️' },
    'רכבת': { name: 'תחבורה', icon: '🚆' },
    'אוטובוס': { name: 'תחבורה', icon: '🚌' },
    'מונית': { name: 'תחבורה', icon: '🚖' },
    'אובר': { name: 'תחבורה', icon: '🚖' },
    'מוסך': { name: 'תחבורה', icon: '🔧' },
    'טיפול לרכב': { name: 'תחבורה', icon: '🔧' },
    'ביטוח רכב': { name: 'תחבורה', icon: '🚗' },
    'טסט': { name: 'תחבורה', icon: '🚗' },

    // Health & Personal Care
    'סופר פארם': { name: 'בריאות', icon: '💊' },
    'בית מרקחת': { name: 'בריאות', icon: '💊' },
    'רופא': { name: 'בריאות', icon: '👨‍⚕️' },
    'ביטוח בריאות': { name: 'בריאות', icon: '🏥' },
    'מספרה': { name: 'טיפוח', icon: '💇‍♂️' },
    'ספר': { name: 'טיפוח', icon: '💇‍♂️' },
    'לק': { name: 'טיפוח', icon: '💅' },
    'ציפורניים': { name: 'טיפוח', icon: '💅' },
    'קוסמטיקאית': { name: 'טיפוח', icon: '💆‍♀️' },
    'איפור': { name: 'טיפוח', icon: '💄' },

    // Shopping & Leisure
    'בגדים': { name: 'קניות', icon: '👕' },
    'נעלים': { name: 'קניות', icon: '👟' },
    'זארה': { name: 'קניות', icon: '👗' },
    'אסוס': { name: 'קניות', icon: '📦' },
    'אמזון': { name: 'קניות', icon: '📦' },
    'טרמינל': { name: 'קניות', icon: '🛍️' },
    'קניון': { name: 'קניות', icon: '🛍️' },
    'מתנה': { name: 'מתנות', icon: '🎁' },
    'סרט': { name: 'בילויים', icon: '🎬' },
    'הופעה': { name: 'בילויים', icon: '🎤' },

    // Other
    'לימודים': { name: 'לימודים', icon: '📚' },
    'קורס': { name: 'לימודים', icon: '🎓' },
    'כושר': { name: 'בריאות', icon: '💪' },
    'חדר כושר': { name: 'בריאות', icon: '💪' },
    'הולמס פלייס': { name: 'בריאות', icon: '💪' },
};

/** All distinct category matches for ambiguous descriptions (e.g. "סופר וקפה"). */
export function detectAllCategoryMatches(description: string): CategoryDetectionResult[] {
    if (!description.trim()) return [];

    const lowerDesc = description.toLowerCase();
    const seen = new Set<string>();
    const out: CategoryDetectionResult[] = [];

    for (const [key, value] of Object.entries(dictionary)) {
        if (lowerDesc.includes(key.toLowerCase()) && !seen.has(value.name)) {
            seen.add(value.name);
            out.push(value);
        }
    }

    return out;
}

export function detectCategory(description: string): CategoryDetectionResult | null {
    if (!description) return null;

    const lowerDesc = description.toLowerCase();

    // Exact match or partial match
    for (const [key, value] of Object.entries(dictionary)) {
        if (lowerDesc.includes(key.toLowerCase())) {
            return value;
        }
    }

    return null;
}
