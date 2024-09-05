import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Button } from './components/Button'
import Input from './components/Input'
import Modal from './components/Modal'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import Container from './components/Container'
import Items from './components/Item'
import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { useSequentialRequest } from './hooks/use-sequential-request'

type DNDType = {
  id: UniqueIdentifier
  title: string
  items: {
    id: UniqueIdentifier
    title: string
  }[]
}

interface ContainerType {
  id: string
  title: string
  description: string
  position: number
  items: ItemType[]
}

interface ItemType {
  id: string
  title: string
  position: number
}

function App() {
  const [containers, setContainers] = useState<ContainerType[]>([])
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [currentContainerId, setCurrentContainerId] =
    useState<UniqueIdentifier>()
  const [containerName, setContainerName] = useState('')
  const [itemName, setItemName] = useState('')
  const [showAddContainerModal, setShowAddContainerModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)

  const run = useSequentialRequest((signal: AbortSignal) =>
    fetch('https://example.com/api/endpoint', {
      signal,
      method: 'POST', // Specifies the HTTP method
      headers: {
        'Content-Type': 'application/json', // Set the content type to JSON (or others like 'application/x-www-form-urlencoded' if needed)
        Authorization: 'Bearer your-token-here', // Optional: for protected APIs
      },
      body: JSON.stringify({
        key1: 'value1',
        key2: 'value2',
      }), // Body is the data to be sent, in stringified format
    }).then((res) => res.text())
  )

  const onAddContainer = () => {
    // if (!containerName) return
    // const id = `container-${uuidv4()}`
    // setContainers([
    //   ...containers,
    //   {
    //     id,
    //     title: containerName,
    //     items: [],
    //   },
    // ])
    // setContainerName('')
    // setShowAddContainerModal(false)
  }

  const onAddItem = () => {
    // if (!itemName) return
    // const id = `item-${uuidv4()}`
    // const container = containers.find((item) => item.id === currentContainerId)
    // if (!container) return
    // container.items.push({
    //   id,
    //   title: itemName,
    // })
    // setContainers([...containers])
    // setItemName('')
    // setShowAddItemModal(false)
  }

  // Find the value of the items
  function findValueOfItems(id: UniqueIdentifier | undefined, type: string) {
    if (type === 'container') {
      return containers.find((item) => item.id === id)
    }
    if (type === 'item') {
      return containers.find((container) =>
        container.items.find((item) => item.id === id)
      )
    }
  }

  const findItemTitle = (id: UniqueIdentifier | undefined) => {
    const container = findValueOfItems(id, 'item')
    if (!container) return ''
    const item = container.items.find((item) => item.id === id)
    if (!item) return ''
    return item.title
  }

  const fetchContainersAndItems = async () => {
    const { data } = await axios('http://localhost:3000/api/containers')
    console.log(data)
    setContainers(data)
  }

  const updateItemsOrder = async (containerId: string, items: ItemType[]) => {
    try {
      await axios.patch(
        `http://localhost:3000/api/containers/${containerId}/items-order`,
        {
          items: items.map((item, index) => ({ id: item.id, position: index })),
        }
      )
    } catch (error) {
      console.error('Error updating items order:', error)
      // You might want to handle this error, perhaps by showing a notification to the user
    }
  }

  useEffect(() => {
    fetchContainersAndItems()
  }, [])

  // const findContainerTitle = (id: UniqueIdentifier | undefined) => {
  //   const container = findValueOfItems(id, 'container')
  //   if (!container) return ''
  //   return container.title
  // }

  // const findContainerItems = (id: string) => {
  //   const container = findValueOfItems(id, 'container')
  //   if (!container) return []
  //   return container.items
  // }

  // DND Handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const { id } = active
    setActiveId(id)
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event

    // Handle Items Sorting
    if (
      active.id.toString().includes('item') &&
      over?.id.toString().includes('item') &&
      active &&
      over &&
      active.id !== over.id
    ) {
      // Find the active container and over container
      const activeContainer = findValueOfItems(active.id, 'item')
      const overContainer = findValueOfItems(over.id, 'item')

      // If the active or over container is not found, return
      if (!activeContainer || !overContainer) return

      // Find the index of the active and over container
      const activeContainerIndex = containers.findIndex(
        (container) => container.id === activeContainer.id
      )
      const overContainerIndex = containers.findIndex(
        (container) => container.id === overContainer.id
      )

      // Find the index of the active and over item
      const activeitemIndex = activeContainer.items.findIndex(
        (item) => item.id === active.id
      )
      const overitemIndex = overContainer.items.findIndex(
        (item) => item.id === over.id
      )
      // In the same container
      if (activeContainerIndex === overContainerIndex) {
        let newItems = [...containers]
        newItems[activeContainerIndex].items = arrayMove(
          newItems[activeContainerIndex].items,
          activeitemIndex,
          overitemIndex
        )

        setContainers(newItems)

        // console.log('same container')
      } else {
        // In different containers
        let newItems = [...containers]
        const [removeditem] = newItems[activeContainerIndex].items.splice(
          activeitemIndex,
          1
        )
        newItems[overContainerIndex].items.splice(overitemIndex, 0, removeditem)
        setContainers(newItems)
        console.log('diff container')
      }
    }

    // Handling Item Drop Into a Container
    if (
      active.id.toString().includes('item') &&
      over?.id.toString().includes('container') &&
      active &&
      over &&
      active.id !== over.id
    ) {
      // Find the active and over container
      const activeContainer = findValueOfItems(active.id, 'item')
      const overContainer = findValueOfItems(over.id, 'container')

      // If the active or over container is not found, return
      if (!activeContainer || !overContainer) return

      // Find the index of the active and over container
      const activeContainerIndex = containers.findIndex(
        (container) => container.id === activeContainer.id
      )
      const overContainerIndex = containers.findIndex(
        (container) => container.id === overContainer.id
      )

      // Find the index of the active and over item
      const activeitemIndex = activeContainer.items.findIndex(
        (item) => item.id === active.id
      )

      // Remove the active item from the active container and add it to the over container
      let newItems = [...containers]
      const [removeditem] = newItems[activeContainerIndex].items.splice(
        activeitemIndex,
        1
      )
      newItems[overContainerIndex].items.push(removeditem)
      setContainers(newItems)

      // console.log('drop container')
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) return

    // Handling Container Sorting
    if (
      active.id.toString().includes('container') &&
      over.id.toString().includes('container') &&
      active.id !== over.id
    ) {
      const activeContainerIndex = containers.findIndex(
        (container) => container.id === active.id
      )
      const overContainerIndex = containers.findIndex(
        (container) => container.id === over.id
      )
      let newItems = arrayMove(
        containers,
        activeContainerIndex,
        overContainerIndex
      )
      setContainers(newItems)
      // You might want to add a function here to update container positions in the backend
    }

    // Handling item Sorting
    if (
      active.id.toString().includes('item') &&
      over.id.toString().includes('item') &&
      active.id !== over.id
    ) {
      const activeContainer = findValueOfItems(
        active.id,
        'item'
      ) as ContainerType
      const overContainer = findValueOfItems(over.id, 'item') as ContainerType

      if (!activeContainer || !overContainer) return

      const activeContainerIndex = containers.findIndex(
        (container) => container.id === activeContainer.id
      )
      const overContainerIndex = containers.findIndex(
        (container) => container.id === overContainer.id
      )
      const activeItemIndex = activeContainer.items.findIndex(
        (item) => item.id === active.id
      )
      const overItemIndex = overContainer.items.findIndex(
        (item) => item.id === over.id
      )

      let newItems = [...containers]

      if (activeContainerIndex === overContainerIndex) {
        // In the same container
        newItems[activeContainerIndex].items = arrayMove(
          newItems[activeContainerIndex].items,
          activeItemIndex,
          overItemIndex
        )
        setContainers(newItems)
        console.log('END same container')
      } else {
        // In different containers
        const [movedItem] = newItems[activeContainerIndex].items.splice(
          activeItemIndex,
          1
        )
        newItems[overContainerIndex].items.splice(overItemIndex, 0, movedItem)
        setContainers(newItems)
        console.log('END diff container')
      }
    }

    // Handling item dropping into Container
    if (
      active.id.toString().includes('item') &&
      over.id.toString().includes('container') &&
      active.id !== over.id
    ) {
      const activeContainer = findValueOfItems(
        active.id,
        'item'
      ) as ContainerType
      const overContainer = findValueOfItems(
        over.id,
        'container'
      ) as ContainerType

      if (!activeContainer || !overContainer) return

      const activeContainerIndex = containers.findIndex(
        (container) => container.id === activeContainer.id
      )
      const overContainerIndex = containers.findIndex(
        (container) => container.id === overContainer.id
      )
      const activeItemIndex = activeContainer.items.findIndex(
        (item) => item.id === active.id
      )

      let newItems = [...containers]
      const [movedItem] = newItems[activeContainerIndex].items.splice(
        activeItemIndex,
        1
      )
      newItems[overContainerIndex].items.push(movedItem)
      setContainers(newItems)

      console.log('END diff container')
    }
    console.log('container end')

    setActiveId(null)
  }

  return (
    <div className='mx-auto max-w-7xl py-10'>
      {/* Add Container Modal */}
      <Modal
        showModal={showAddContainerModal}
        setShowModal={setShowAddContainerModal}
      >
        <div className='flex flex-col w-full items-start gap-y-4'>
          <h1 className='text-gray-800 text-3xl font-bold'>Add Container</h1>
          <Input
            type='text'
            placeholder='Container Title'
            name='containername'
            value={containerName}
            onChange={(e) => setContainerName(e.target.value)}
          />
          <Button onClick={onAddContainer}>Add container</Button>
        </div>
      </Modal>
      {/* Add Item Modal */}
      <Modal showModal={showAddItemModal} setShowModal={setShowAddItemModal}>
        <div className='flex flex-col w-full items-start gap-y-4'>
          <h1 className='text-gray-800 text-3xl font-bold'>Add Item</h1>
          <Input
            type='text'
            placeholder='Item Title'
            name='itemname'
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
          <Button onClick={onAddItem}>Add Item</Button>
        </div>
      </Modal>
      <div className='flex items-center justify-between gap-y-2'>
        <h1 className='text-gray-800 text-3xl font-bold'>Dnd-kit Guide</h1>
        <Button onClick={() => setShowAddContainerModal(true)}>
          Add Container
        </Button>
      </div>
      <div className='mt-10'>
        <div className='grid grid-cols-4 gap-6'>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={containers.map((i) => i.id)}>
              {containers.map((container) => (
                <Container
                  id={container.id}
                  title={container.title}
                  key={container.id}
                  onAddItem={() => {
                    setShowAddItemModal(true)
                    setCurrentContainerId(container.id)
                  }}
                >
                  <SortableContext items={container.items.map((i) => i.id)}>
                    <div className='flex items-start flex-col gap-y-4'>
                      {container.items.map((i) => (
                        <Items title={i.title} id={i.id} key={i.id} />
                      ))}
                    </div>
                  </SortableContext>
                </Container>
              ))}
            </SortableContext>
            <DragOverlay adjustScale={false}>
              {/* Drag Overlay For item Item */}
              {activeId && activeId.toString().includes('item') && (
                <Items id={activeId} title={findItemTitle(activeId)} />
              )}
              {/* Drag Overlay For Container */}
              {/* {activeId && activeId.toString().includes('container') && (
                <Container id={activeId} title={findContainerTitle(activeId)}>
                  {findContainerItems(activeId).map((i) => (
                    <Items key={i.id} title={i.title} id={i.id} />
                  ))}
                </Container>
              )} */}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  )
}

export default App
