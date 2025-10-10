import constants from "../constants/constants";
import useCategories from "../hooks/useCategories";

const colorMap = constants.colorMap;
type ColorMapKey = keyof typeof colorMap;

function getColorsFromCategoryColor(colorVal?: string) {
    if (!colorVal) return colorMap.gray;

    if (colorVal.startsWith("#")) {
        return { dark: colorVal, light: colorVal + "26" };
    }

    const key = colorVal as ColorMapKey;
    if (key in colorMap) return colorMap[key];

    return colorMap.gray;
}

function Category({ title }: { title: string }) {
    const displayTitle = title ?? 'Other';
    const { data: categoriesData = [], isLoading: categoriesLoading } = useCategories();

    if (!categoriesData) return null;
    const cat = categoriesData.find((c) =>
        (c as any).category === title
    );

    if (!cat) {
        return null;
    }

    const { dark, light } = getColorsFromCategoryColor((cat as any).color);

    return (
        <div className="w-fit font-cabin border-2 pl-1.5 pr-2 text-sm font-medium rounded-full flex items-center gap-x-1 select-none"
            style={{ backgroundColor: light, borderColor: dark }}>
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: dark }} />
            <p style={{ color: dark }}>{displayTitle}</p>
        </div>
    );
}

export default Category;