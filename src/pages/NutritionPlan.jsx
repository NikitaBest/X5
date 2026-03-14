import { useState } from 'react'
import Page from '../layout/Page.jsx'
import Header from '../layout/Header.jsx'
import DayCalendar from '../components/DayCalendar.jsx'
import MealCard from '../components/MealCard.jsx'
import MealDetailSheet from '../components/MealDetailSheet.jsx'
import './Results.css'

const MEALS_MOCK = [
  {
    id: 'oatmeal',
    title: 'Овсяная каша на молоке Пятеро...',
    shortTitle: 'Овсяная каша на молоке',
    statusTag: 'Медленные углеводы, стабильный сахар',
    tags: ['Медленные углеводы', 'стабильный сахар'],
    composition: 'Молоко 2,5%, вода питьевая, хлопья овсяные, сахар, масло сливочное, соль, крахмал, ароматизатор.',
    calories: '280 ккал',
    protein: 12,
    fat: 8,
    carbs: 45,
  },
  {
    id: 'chicken',
    title: 'Куриное филе с гречкой и овощами',
    shortTitle: 'Куриное филе с гречкой и овощами',
    statusTag: 'Белок + клетчатка, контроль аппетита',
    tags: ['Белок + клетчатка', 'контроль аппетита'],
    composition: 'Куриное филе, гречка, томаты, огурцы, оливковое масло, зелень, соль, перец.',
    calories: '420 ккал',
    protein: 38,
    fat: 14,
    carbs: 32,
  },
  {
    id: 'fish',
    title: 'Рыба на пару с овощами',
    shortTitle: 'Рыба на пару с овощами',
    statusTag: 'Лёгкий ужин, поддержка сердца',
    tags: ['Лёгкий ужин', 'поддержка сердца'],
    composition: 'Филе рыбы, брокколи, стручковая фасоль, морковь, оливковое масло, лимон, зелень.',
    calories: '290 ккал',
    protein: 28,
    fat: 10,
    carbs: 18,
  },
]

const ALTERNATIVES_BREAKFAST = [
  { ...MEALS_MOCK[0], title: 'Овсяная каша на молоке Пятерочка Кафе 200г', composition: 'Молоко 2,5%, вода питьевая, хлопья овсяные, сахар, масло сливочное, соль, крахмал, ароматизатор.' },
  { id: 'toast', title: 'Тост с авокадо и яйцом', shortTitle: 'Тост с авокадо и яйцом', statusTag: 'Медленные углеводы, стабильный сахар', tags: ['Медленные углеводы', 'стабильный сахар'], composition: 'Хлеб цельнозерновой, авокадо, яйцо куриное, оливковое масло, соль, перец.', calories: '320 ккал', protein: 14, fat: 22, carbs: 18 },
  { id: 'omelette', title: 'Омлет с овощами и зеленью', shortTitle: 'Омлет с овощами и зеленью', statusTag: 'Медленные углеводы, стабильный сахар', tags: ['Медленные углеводы', 'стабильный сахар'], composition: 'Яйца куриные, перец болгарский, помидор, шпинат, оливковое масло, зелень.', calories: '260 ккал', protein: 16, fat: 18, carbs: 8 },
]

const ALTERNATIVES_LUNCH = [
  MEALS_MOCK[1],
  { id: 'borscht', title: 'Борщ с говядиной и сметаной', shortTitle: 'Борщ с говядиной', statusTag: 'Белок + клетчатка', tags: ['Белок + клетчатка'], composition: 'Говядина, свёкла, капуста, картофель, морковь, лук, сметана.', calories: '350 ккал', protein: 20, fat: 12, carbs: 38 },
  { id: 'salad', title: 'Салат с курицей и киноа', shortTitle: 'Салат с курицей и киноа', statusTag: 'Белок + клетчатка', tags: ['Белок + клетчатка'], composition: 'Куриная грудка, киноа, огурец, томаты, зелень, оливковое масло.', calories: '380 ккал', protein: 32, fat: 14, carbs: 32 },
]

const ALTERNATIVES_DINNER = [
  MEALS_MOCK[2],
  { id: 'cottage', title: 'Творог с зеленью и овощами', shortTitle: 'Творог с зеленью', statusTag: 'Лёгкий ужин', tags: ['Лёгкий ужин'], composition: 'Творог 5%, огурец, укроп, соль.', calories: '180 ккал', protein: 24, fat: 6, carbs: 10 },
  { id: 'turkey', title: 'Индейка с тушёными овощами', shortTitle: 'Индейка с овощами', statusTag: 'Лёгкий ужин', tags: ['Лёгкий ужин'], composition: 'Филе индейки, кабачок, баклажан, томаты, зелень.', calories: '250 ккал', protein: 30, fat: 8, carbs: 14 },
]

const SLOT_LABELS = ['Завтрак', 'Обед', 'Ужин']
const ALTERNATIVES_BY_SLOT = [ALTERNATIVES_BREAKFAST, ALTERNATIVES_LUNCH, ALTERNATIVES_DINNER]

function NutritionPlan() {
  const [meals, setMeals] = useState([...MEALS_MOCK])
  const [activeSlot, setActiveSlot] = useState(null)
  const [openReplaceView, setOpenReplaceView] = useState(false)

  const activeMeal = activeSlot != null ? meals[activeSlot] : null
  const mealType = activeSlot != null ? SLOT_LABELS[activeSlot] : null

  const handleReplaceMeal = (slotIndex, newMeal) => {
    setMeals((prev) => {
      const next = [...prev]
      next[slotIndex] = { ...newMeal, id: newMeal.id || next[slotIndex].id }
      return next
    })
  }

  const handleCloseSheet = () => {
    setActiveSlot(null)
    setOpenReplaceView(false)
  }

  return (
    <Page className="results-page">
      <Header title="Ваш рацион" showBack />
      <DayCalendar />

      <MealCard
        mealType="Завтрак"
        title={meals[0].shortTitle}
        description={meals[0].composition}
        tag={meals[0].statusTag}
        onClick={() => { setOpenReplaceView(false); setActiveSlot(0); }}
        onReplaceClick={() => { setOpenReplaceView(true); setActiveSlot(0); }}
      />

      <MealCard
        mealType="Обед"
        title={meals[1].shortTitle}
        description={meals[1].composition}
        tag={meals[1].statusTag}
        onClick={() => { setOpenReplaceView(false); setActiveSlot(1); }}
        onReplaceClick={() => { setOpenReplaceView(true); setActiveSlot(1); }}
      />

      <MealCard
        mealType="Ужин"
        title={meals[2].shortTitle}
        description={meals[2].composition}
        tag={meals[2].statusTag}
        onClick={() => { setOpenReplaceView(false); setActiveSlot(2); }}
        onReplaceClick={() => { setOpenReplaceView(true); setActiveSlot(2); }}
      />

      <MealDetailSheet
        open={activeSlot != null}
        onClose={handleCloseSheet}
        meal={activeMeal}
        mealType={mealType}
        slotIndex={activeSlot}
        alternatives={activeSlot != null ? ALTERNATIVES_BY_SLOT[activeSlot] : []}
        onReplaceMeal={handleReplaceMeal}
        initialView={openReplaceView ? 'alternatives' : 'detail'}
      />
    </Page>
  )
}

export default NutritionPlan

