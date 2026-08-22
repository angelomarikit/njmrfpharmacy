import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { PageLoader } from '@/components/ui/Spinner'
import { useSite } from '@/contexts/SiteContext'
import { useToast } from '@/contexts/ToastContext'
import { createCategory, fetchCategories } from '@/services/categoryService'
import {
  addProductImage,
  createProduct,
  deleteProduct,
  deleteProductImage,
  fetchProductById,
  updateProduct,
} from '@/services/productService'
import { deleteSiteAssetByUrl, uploadSiteAsset } from '@/services/storageService'
import { slugify } from '@/utils/slug'
import { toUserMessage } from '@/lib/errors'
import type { ProductCategory, ProductImage } from '@/types/database'

type PendingImage = {
  id: string
  file: File
  preview: string
}

export default function ProductEditPage() {
  const { id = 'new' } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = id === 'new'
  const { siteId } = useSite()
  const toast = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const pendingImagesRef = useRef<PendingImage[]>([])
  pendingImagesRef.current = pendingImages
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('0')
  const [compareAt, setCompareAt] = useState('')
  const [sku, setSku] = useState('')
  const [stock, setStock] = useState('0')
  const [threshold, setThreshold] = useState('5')
  const [weight, setWeight] = useState('100')
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [categoryId, setCategoryId] = useState(() => searchParams.get('category') ?? '')
  const [newCategory, setNewCategory] = useState('')
  const [published, setPublished] = useState(false)
  const [prescription, setPrescription] = useState(false)
  const [productId, setProductId] = useState<string | null>(isNew ? null : id)

  useEffect(() => {
    if (!siteId) return
    void fetchCategories(siteId).then(setCategories)
  }, [siteId])

  useEffect(() => {
    return () => {
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview))
    }
  }, [])

  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    void fetchProductById(id).then((product) => {
      if (cancelled) return
      setProductId(product.id)
      setTitle(product.title)
      setSlug(product.slug)
      setDescription(product.description ?? '')
      setPrice(String(product.price))
      setCompareAt(product.compare_at_price == null ? '' : String(product.compare_at_price))
      setSku(product.sku ?? '')
      setStock(String(product.stock_quantity))
      setThreshold(String(product.low_stock_threshold))
      setWeight(String(product.weight_grams))
      setLength(product.length_cm == null ? '' : String(product.length_cm))
      setWidth(product.width_cm == null ? '' : String(product.width_cm))
      setHeight(product.height_cm == null ? '' : String(product.height_cm))
      setCategoryId(product.category_id ?? searchParams.get('category') ?? '')
      setPublished(product.is_published)
      setPrescription(product.is_prescription)
      setImages(product.product_images ?? [])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  async function ensureCategory() {
    if (!siteId) return null
    if (categoryId) return categoryId
    if (!newCategory.trim()) return null
    const created = await createCategory(siteId, {
      name: newCategory.trim(),
      slug: slugify(newCategory),
      is_active: true,
    })
    setCategories((current) => [...current, created])
    setCategoryId(created.id)
    setNewCategory('')
    return created.id
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!siteId) return
    setSaving(true)
    try {
      const nextCategory = await ensureCategory()
      const payload = {
        title,
        slug: slug || slugify(title),
        description: description || null,
        price: Number(price),
        compare_at_price: compareAt ? Number(compareAt) : null,
        sku: sku || null,
        stock_quantity: Number(stock),
        low_stock_threshold: Number(threshold),
        weight_grams: Number(weight) || 100,
        length_cm: length ? Number(length) : null,
        width_cm: width ? Number(width) : null,
        height_cm: height ? Number(height) : null,
        category_id: nextCategory,
        is_published: published,
        is_prescription: prescription,
      }
      let savedId = productId
      if (savedId) {
        await updateProduct(savedId, payload)
      } else {
        const created = await createProduct(siteId, payload)
        savedId = created.id
        setProductId(created.id)
      }

      if (pendingImages.length > 0 && savedId) {
        const uploaded: ProductImage[] = []
        for (const [index, pending] of pendingImages.entries()) {
          const url = await uploadSiteAsset(siteId, `products/${savedId}`, pending.file)
          const image = await addProductImage(siteId, savedId, url, images.length + index)
          uploaded.push(image)
          URL.revokeObjectURL(pending.preview)
        }
        setImages((current) => [...current, ...uploaded])
        setPendingImages([])
      }

      toast.success(productId && !isNew ? 'Product saved' : 'Product created')
      if (isNew && savedId) {
        navigate(`/admin/products/${savedId}`, { replace: true })
      }
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to save this product.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleImage(file: File) {
    if (!siteId) return
    if (!productId) {
      setPendingImages((current) => [
        ...current,
        { id: `${file.name}-${file.size}-${Date.now()}`, file, preview: URL.createObjectURL(file) },
      ])
      return
    }
    setUploading(true)
    try {
      const url = await uploadSiteAsset(siteId, `products/${productId}`, file)
      const image = await addProductImage(siteId, productId, url, images.length)
      setImages((current) => [...current, image])
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to upload this image.'))
    } finally {
      setUploading(false)
    }
  }

  function handleRemovePending(pending: PendingImage) {
    URL.revokeObjectURL(pending.preview)
    setPendingImages((current) => current.filter((item) => item.id !== pending.id))
  }

  async function handleRemoveImage(image: ProductImage) {
    await deleteProductImage(image.id)
    await deleteSiteAssetByUrl(image.image_url)
    setImages((current) => current.filter((item) => item.id !== image.id))
  }

  async function handleDeleteProduct() {
    if (!productId) return
    setDeleting(true)
    try {
      await deleteProduct(productId)
      toast.success('Product deleted')
      navigate('/admin/products')
    } catch (error) {
      toast.error(toUserMessage(error, 'Unable to delete this product.'))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loading) return <PageLoader label="Loading product…" />

  return (
    <>
    <form className="mx-auto max-w-3xl space-y-6" onSubmit={(event) => void handleSave(event)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link to="/admin/products" className="text-sm text-forest hover:underline">
            Back to products
          </Link>
          <h1 className="font-display text-3xl">{isNew ? 'Add product' : 'Edit product'}</h1>
        </div>
        {!isNew ? (
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        ) : null}
      </div>

      <div className="space-y-4 rounded-2xl border border-line bg-white p-5">
        <Input
          label="Title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (isNew) setSlug(slugify(event.target.value))
          }}
          required
        />
        <Input label="URL slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} required />
        <Textarea label="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Price (₱)" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required />
          <Input label="Compare-at price" type="number" min="0" step="0.01" value={compareAt} onChange={(event) => setCompareAt(event.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="SKU" value={sku} onChange={(event) => setSku(event.target.value)} />
          <Input label="Stock quantity" type="number" min="0" value={stock} onChange={(event) => setStock(event.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Low stock threshold" type="number" min="0" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
          <Input label="Weight (grams)" type="number" min="1" value={weight} onChange={(event) => setWeight(event.target.value)} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Length cm" type="number" min="0" value={length} onChange={(event) => setLength(event.target.value)} />
          <Input label="Width cm" type="number" min="0" value={width} onChange={(event) => setWidth(event.target.value)} />
          <Input label="Height cm" type="number" min="0" value={height} onChange={(event) => setHeight(event.target.value)} />
        </div>
        <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Input
          label="Or create a category"
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="Vitamins"
        />
        <Switch checked={published} onChange={setPublished} label="Published on the storefront" />
        <Switch checked={prescription} onChange={setPrescription} label="Prescription item" />
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <ImageUpload
          label="Product images"
          hint={
            productId
              ? 'JPG, PNG, or WebP. Maximum 5 MB.'
              : 'Add photos now. They will upload when you save the product.'
          }
          uploading={uploading}
          onSelect={(file) => void handleImage(file)}
        />
        {images.length > 0 || pendingImages.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {images.map((image) => (
              <div key={image.id} className="overflow-hidden rounded-xl border border-line">
                <img src={image.image_url} alt="" className="aspect-square object-cover" />
                <button
                  type="button"
                  className="w-full py-2 text-xs text-red-700"
                  onClick={() => void handleRemoveImage(image)}
                >
                  Remove
                </button>
              </div>
            ))}
            {pendingImages.map((image) => (
              <div key={image.id} className="overflow-hidden rounded-xl border border-line">
                <img src={image.preview} alt="" className="aspect-square object-cover" />
                <button type="button" className="w-full py-2 text-xs text-red-700" onClick={() => handleRemovePending(image)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save product'}
      </Button>
    </form>
    <ConfirmModal
      open={confirmDelete}
      title="Delete this product?"
      description={`“${title || 'This product'}” will be removed from the catalog. This cannot be undone.`}
      confirmLabel="Delete product"
      busy={deleting}
      onConfirm={() => void handleDeleteProduct()}
      onClose={() => {
        if (!deleting) setConfirmDelete(false)
      }}
    />
    </>
  )
}
