import axios from 'axios'
import { useState, useCallback } from 'react'

interface ContainerType {
  id: string
  items: ItemType[]
}

interface ItemType {
  id: string
  position: number
}

const useItemsOrder = () => {
  const [isUpdating, setIsUpdating] = useState(false)

  const updateItemsOrder = useCallback(async (containers: ContainerType[]) => {
    setIsUpdating(true)
    try {
      const containersData = containers.map((container) => ({
        id: container.id,
        items: container.items.map((item, index) => ({
          id: item.id,
          position: index,
        })),
      }))

      await axios.patch(`http://localhost:3000/api/containers-order-items`, {
        containers: containersData,
      })
    } catch (error) {
      alert(error)
      console.log(error)
    } finally {
      setIsUpdating(false)
    }
  }, [])

  return { updateItemsOrder, isUpdating }
}

export default useItemsOrder
