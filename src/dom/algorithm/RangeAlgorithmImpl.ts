import { DOMAlgorithm, RangeAlgorithm } from './interfaces'
import { SubAlgorithmImpl } from './SubAlgorithmImpl'
import {
  NodeInternal, AbstractRangeInternal, DocumentInternal,
  DocumentFragmentInternal, CharacterDataInternal, RangeInternal
} from '../interfacesInternal'
import { BoundaryPoint, BoundaryPosition } from '../interfaces'
import { Guard } from '../util'
import { DOMException } from '../DOMException'

/**
 * Contains range algorithms.
 */
export class RangeAlgorithmImpl extends SubAlgorithmImpl implements RangeAlgorithm {

  /**
   * Initializes a new `RangeAlgorithm`.
   * 
   * @param algorithm - parent DOM algorithm
   */
  public constructor(algorithm: DOMAlgorithm) {
    super(algorithm)
  }

  /** @inheritdoc */
  collapsed(range: AbstractRangeInternal): boolean {
    /**
     * A range is collapsed if its start node is its end node and its start offset is its end offset.
     */
    return (range._startNode === range._endNode && range._startOffset === range._endOffset)
  }

  /** @inheritdoc */
  root(range: AbstractRangeInternal): NodeInternal {
    /**
     * The root of a live range is the root of its start node.
     */
    return this.dom.tree.rootNode(range._startNode)
  }

  /** @inheritdoc */
  isContained(node: NodeInternal, range: AbstractRangeInternal): boolean {
    /**
     * A node node is contained in a live range range if node’s root is range’s
     * root, and (node, 0) is after range’s start, and (node, node’s length) is
     * before range’s end.
     */
    return (this.dom.tree.rootNode(node) === this.root(range) &&
      this.dom.boundaryPoint.position([node, 0], range._start) === BoundaryPosition.After &&
      this.dom.boundaryPoint.position([node, this.dom.tree.nodeLength(node)], range._end) === BoundaryPosition.Before)
  }

  /** @inheritdoc */
  isPartiallyContained(node: NodeInternal, range: AbstractRangeInternal): boolean {
    /**
     * A node is partially contained in a live range if it’s an inclusive
     * ancestor of the live range’s start node but not its end node, 
     * or vice versa.
     */
    const startCheck = this.dom.tree.isAncestorOf(range._startNode, node, true)
    const endCheck = this.dom.tree.isAncestorOf(range._endNode, node, true)

    return (startCheck && !endCheck) || (!startCheck && endCheck)
  }

  /** @inheritdoc */
  setTheStart(range: AbstractRangeInternal, node: NodeInternal, offset: number): void {
    /**
     * 1. If node is a doctype, then throw an "InvalidNodeTypeError" DOMException.
     * 2. If offset is greater than node’s length, then throw an "IndexSizeError" 
     * DOMException.
     * 3. Let bp be the boundary point (node, offset).
     * 4. If these steps were invoked as "set the start"
     * 4.1. If bp is after the range’s end, or if range’s root is not equal to
     * node’s root, set range’s end to bp.
     * 4.2. Set range’s start to bp.
     */
    if (Guard.isDocumentTypeNode(node.nodeType)) {
      throw DOMException.InvalidNodeTypeError
    }
    if (offset > this.dom.tree.nodeLength(node)) {
      throw DOMException.IndexSizeError
    }

    const bp: BoundaryPoint = [node, offset]

    if (this.dom.boundaryPoint.position(bp, range._end) === BoundaryPosition.After ||
      this.root(range) !== this.dom.tree.rootNode(node)) {
      range._end = bp
    }

    range._start = bp
  }

  /** @inheritdoc */
  setTheEnd(range: AbstractRangeInternal, node: NodeInternal, offset: number): void {
    /**
     * 1. If node is a doctype, then throw an "InvalidNodeTypeError" DOMException.
     * 2. If offset is greater than node’s length, then throw an "IndexSizeError" 
     * DOMException.
     * 3. Let bp be the boundary point (node, offset).
     * 4. If these steps were invoked as "set the end"
     * 4.1. If bp is before the range’s start, or if range’s root is not equal
     * to node’s root, set range’s start to bp.
     * 4.2. Set range’s end to bp.
     */
    if (Guard.isDocumentTypeNode(node.nodeType)) {
      throw DOMException.InvalidNodeTypeError
    }
    if (offset > this.dom.tree.nodeLength(node)) {
      throw DOMException.IndexSizeError
    }

    const bp: BoundaryPoint = [node, offset]

    if (this.dom.boundaryPoint.position(bp, range._start) === BoundaryPosition.Before ||
      this.root(range) !== this.dom.tree.rootNode(node)) {
      range._start = bp
    }

    range._end = bp
  }

  /** @inheritdoc */
  select(node: NodeInternal, range: AbstractRangeInternal): void {
    /**
     * 1. Let parent be node’s parent.
     * 2. If parent is null, then throw an "InvalidNodeTypeError" DOMException.
     */
    const parent = node._parent
    if (parent === null)
      throw DOMException.InvalidNodeTypeError

    /**
     * 3. Let index be node’s index.
     * 4. Set range’s start to boundary point (parent, index).
     * 5. Set range’s end to boundary point (parent, index plus 1).
     */
    const index = this.dom.tree.index(node)
    range._start = [parent, index]
    range._end = [parent, index + 1]
  }

  /** @inheritdoc */
  extract(range: AbstractRangeInternal): DocumentFragmentInternal {
    /**
     * 1. Let fragment be a new DocumentFragment node whose node document is
     * range’s start node’s node document.
     * 2. If range is collapsed, then return fragment.
     */
    const fragment = this.dom.create.documentFragment(range._startNode._nodeDocument)
    if (this.collapsed(range)) return fragment

    /**
     * 3. Let original start node, original start offset, original end node,
     * and original end offset be range’s start node, start offset, end node,
     * and end offset, respectively.
     * 4. If original start node is original end node, and they are a Text, 
     * ProcessingInstruction, or Comment node:
     * 4.1. Let clone be a clone of original start node.
     * 4.2. Set the data of clone to the result of substringing data with node
     * original start node, offset original start offset, and count original end
     * offset minus original start offset.
     * 4.3. Append clone to fragment.
     * 4.4. Replace data with node original start node, offset original start
     * offset, count original end offset minus original start offset, and data
     * the empty string.
     * 4.5. Return fragment.
     */
    const originalStartNode = range._startNode
    const originalStartOffset = range._startOffset
    const originalEndNode = range._endNode
    const originalEndOffset = range._endOffset

    if (originalStartNode === originalEndNode &&
      Guard.isCharacterDataNode(originalStartNode)) {
      const clone = this.dom.node.clone(originalStartNode) as CharacterDataInternal
      clone._data = this.dom.characterData.substringData(
        originalStartNode, originalStartOffset,
        originalEndOffset - originalStartOffset)
      fragment.append(clone)
      this.dom.characterData.replaceData(
        originalStartNode, originalStartOffset,
        originalEndOffset - originalStartOffset, '')
      return fragment
    }

    /**
     * 5. Let common ancestor be original start node.
     * 6. While common ancestor is not an inclusive ancestor of original end
     * node, set common ancestor to its own parent.
     */
    let commonAncestor = originalStartNode
    while (!this.dom.tree.isAncestorOf(originalEndNode, commonAncestor, true)) {
      if (commonAncestor.parentNode === null) {
        throw new Error("Parent node is null.")
      }
      commonAncestor = commonAncestor.parentNode as NodeInternal
    }

    /**
     * 7. Let first partially contained child be null.
     * 8. If original start node is not an inclusive ancestor of original end
     * node, set first partially contained child to the first child of common
     * ancestor that is partially contained in range.
     */
    let firstPartiallyContainedChild: NodeInternal | null = null
    if (!this.dom.tree.isAncestorOf(originalEndNode, originalStartNode, true)) {
      for (const node of commonAncestor.childNodes) {
        if (this.isPartiallyContained(node as NodeInternal, range)) {
          firstPartiallyContainedChild = node as NodeInternal
          break
        }
      }
    }

    /**
     * 9. Let last partially contained child be null.
     * 10. If original end node is not an inclusive ancestor of original start
     * node, set last partially contained child to the last child of common
     * ancestor that is partially contained in range.
     */
    let lastPartiallyContainedChild: NodeInternal | null = null
    if (!this.dom.tree.isAncestorOf(originalStartNode, originalEndNode, true)) {
      let i = commonAncestor.childNodes.length - 1
      for (let i = commonAncestor.childNodes.length - 1; i > 0; i--) {
        const node = commonAncestor.childNodes.item(i)
        if (node === null) {
          throw new Error("Child node is null.")
        }
        if (this.isPartiallyContained(node as NodeInternal, range)) {
          lastPartiallyContainedChild = node as NodeInternal
          break
        }
      }
    }

    /**
     * 11. Let contained children be a list of all children of common ancestor
     * that are contained in range, in tree order.
     * 12. If any member of contained children is a doctype, then throw a
     * "HierarchyRequestError" DOMException.
     */
    const containedChildren: NodeInternal[] = []
    for (const child of commonAncestor.childNodes) {
      if (this.isContained(child as NodeInternal, range)) {
        if (Guard.isDocumentTypeNode(child)) {
          throw DOMException.HierarchyRequestError
        }
        containedChildren.push(child as NodeInternal)
      }
    }

    let newNode: NodeInternal | null = null
    let newOffset: number = 0
    if (this.dom.tree.isAncestorOf(originalEndNode, originalStartNode, true)) {
      /**
       * 13. If original start node is an inclusive ancestor of original end node,
       * set new node to original start node and new offset to original start
       * offset.
       */
      newNode = originalStartNode
      newOffset = originalStartOffset
    } else {
      /**
       * 14. Otherwise:
       * 14.1. Let reference node equal original start node.
       * 14.2. While reference node’s parent is not null and is not an inclusive
       * ancestor of original end node, set reference node to its parent.
       * 14.3. Set new node to the parent of reference node, and new offset to
       * one plus reference node’s index.
       */
      let referenceNode = originalStartNode
      while (referenceNode._parent !== null &&
        !this.dom.tree.isAncestorOf(originalEndNode, referenceNode._parent as NodeInternal)) {
        referenceNode = referenceNode._parent as NodeInternal
      }
      newNode = referenceNode._parent as NodeInternal
      newOffset = 1 + this.dom.tree.index(referenceNode)
    }

    if (firstPartiallyContainedChild !== null &&
      Guard.isCharacterDataNode(firstPartiallyContainedChild)) {
      /**
       * 15. If first partially contained child is a Text, ProcessingInstruction, 
       * or Comment node:
       * 15.1. Let clone be a clone of original start node.
       * 15.2. Set the data of clone to the result of substringing data with 
       * node original start node, offset original start offset, and count 
       * original start node’s length minus original start offset.
       * 15.3. Append clone to fragment.
       * 15.4. Replace data with node original start node, offset original 
       * start offset, count original start node’s length minus original start 
       * offset, and data the empty string.
       */
      const clone = this.dom.node.clone(originalStartNode) as CharacterDataInternal
      clone._data = this.dom.characterData.substringData(
        originalStartNode as CharacterDataInternal, originalStartOffset,
        this.dom.tree.nodeLength(originalStartNode) - originalStartOffset)
      fragment.append(clone)
      this.dom.characterData.replaceData(originalStartNode as CharacterDataInternal,
        originalStartOffset,
        this.dom.tree.nodeLength(originalStartNode) - originalStartOffset, '')
    } else if (firstPartiallyContainedChild !== null) {
      /**
       * 16. Otherwise, if first partially contained child is not null:
       * 16.1. Let clone be a clone of first partially contained child.
       * 16.2. Append clone to fragment.
       * 16.3. Let subrange be a new live range whose start is (original start
       * node, original start offset) and whose end is (first partially
       * contained child, first partially contained child’s length).
       * 16.4. Let subfragment be the result of extracting subrange.
       * 16.5. Append subfragment to clone.
       */
      const clone = this.dom.node.clone(originalStartNode)
      fragment.append(clone)
      const subrange = this.dom.create.range(
        [originalStartNode, originalStartOffset],
        [firstPartiallyContainedChild, this.dom.tree.nodeLength(firstPartiallyContainedChild)])
      const subfragment = this.extract(subrange)
      clone.appendChild(subfragment)
    }

    /**
     * 17. For each contained child in contained children, append contained
     * child to fragment.
     */
    for (const child of containedChildren) {
      fragment.appendChild(child)
    }

    if (lastPartiallyContainedChild !== null &&
      Guard.isCharacterDataNode(lastPartiallyContainedChild)) {
      /**
       * 18. If last partially contained child is a Text, ProcessingInstruction,
       * or Comment node:
       * 18.1. Let clone be a clone of original end node.
       * 18.2. Set the data of clone to the result of substringing data with
       * node original end node, offset 0, and count original end offset.
       * 18.3. Append clone to fragment.
       * 18.4. Replace data with node original end node, offset 0, count
       * original end offset, and data the empty string.
       */
      const clone = this.dom.node.clone(originalEndNode) as CharacterDataInternal
      clone._data = this.dom.characterData.substringData(
        originalEndNode as CharacterDataInternal, 0, originalEndOffset)
      fragment.append(clone)
      this.dom.characterData.replaceData(originalEndNode as CharacterDataInternal,
        0, originalEndOffset, '')
    } else if (lastPartiallyContainedChild !== null) {
      /**
       * 19. Otherwise, if last partially contained child is not null:
       * 19.1. Let clone be a clone of last partially contained child.
       * 19.2. Append clone to fragment.
       * 19.3. Let subrange be a new live range whose start is (last partially
       * contained child, 0) and whose end is (original end node, original
       * end offset).
       * 19.4. Let subfragment be the result of extracting subrange.
       * 19.5. Append subfragment to clone.
       */
      const clone = this.dom.node.clone(lastPartiallyContainedChild)
      fragment.append(clone)
      const subrange = this.dom.create.range(
        [lastPartiallyContainedChild, 0],
        [originalEndNode, originalEndOffset])
      const subfragment = this.extract(subrange)
      clone.appendChild(subfragment)
    }

    /**
     * 20. Set range’s start and end to (new node, new offset).
     */
    range._start = [newNode, newOffset]
    range._end = [newNode, newOffset]

    /**
     * 21. Return fragment.
     */
    return fragment
  }

  /** @inheritdoc */
  cloneTheContents(range: AbstractRangeInternal): DocumentFragmentInternal {
    /**
     * 1. Let fragment be a new DocumentFragment node whose node document
     * is range’s start node’s node document.
     * 2. If range is collapsed, then return fragment.
     */
    const fragment = this.dom.create.documentFragment(range._startNode._nodeDocument)
    if (this.collapsed(range)) return fragment

    /**
     * 3. Let original start node, original start offset, original end node,
     * and original end offset be range’s start node, start offset, end node,
     * and end offset, respectively.
     * 4. If original start node is original end node, and they are a Text, 
     * ProcessingInstruction, or Comment node:
     * 4.1. Let clone be a clone of original start node.
     * 4.2. Set the data of clone to the result of substringing data with node
     * original start node, offset original start offset, and count original end
     * offset minus original start offset.
     * 4.3. Append clone to fragment.
     * 4.5. Return fragment.
     */
    const originalStartNode = range._startNode
    const originalStartOffset = range._startOffset
    const originalEndNode = range._endNode
    const originalEndOffset = range._endOffset

    if (originalStartNode === originalEndNode &&
      Guard.isCharacterDataNode(originalStartNode)) {
      const clone = this.dom.node.clone(originalStartNode) as CharacterDataInternal
      clone._data = this.dom.characterData.substringData(
        originalStartNode, originalStartOffset,
        originalEndOffset - originalStartOffset)
      fragment.append(clone)
    }

    /**
     * 5. Let common ancestor be original start node.
     * 6. While common ancestor is not an inclusive ancestor of original end
     * node, set common ancestor to its own parent.
     */
    let commonAncestor = originalStartNode
    while (!this.dom.tree.isAncestorOf(originalEndNode, commonAncestor, true)) {
      if (commonAncestor.parentNode === null) {
        throw new Error("Parent node is null.")
      }
      commonAncestor = commonAncestor.parentNode as NodeInternal
    }

    /**
     * 7. Let first partially contained child be null.
     * 8. If original start node is not an inclusive ancestor of original end
     * node, set first partially contained child to the first child of common
     * ancestor that is partially contained in range.
     */
    let firstPartiallyContainedChild: NodeInternal | null = null
    if (!this.dom.tree.isAncestorOf(originalEndNode, originalStartNode, true)) {
      for (const node of commonAncestor.childNodes) {
        if (this.isPartiallyContained(node as NodeInternal, range)) {
          firstPartiallyContainedChild = node as NodeInternal
          break
        }
      }
    }

    /**
     * 9. Let last partially contained child be null.
     * 10. If original end node is not an inclusive ancestor of original start
     * node, set last partially contained child to the last child of common
     * ancestor that is partially contained in range.
     */
    let lastPartiallyContainedChild: NodeInternal | null = null
    if (!this.dom.tree.isAncestorOf(originalStartNode, originalEndNode, true)) {
      let i = commonAncestor.childNodes.length - 1
      for (let i = commonAncestor.childNodes.length - 1; i > 0; i--) {
        const node = commonAncestor.childNodes.item(i)
        if (node === null) {
          throw new Error("Child node is null.")
        }
        if (this.isPartiallyContained(node as NodeInternal, range)) {
          lastPartiallyContainedChild = node as NodeInternal
          break
        }
      }
    }

    /**
     * 11. Let contained children be a list of all children of common ancestor
     * that are contained in range, in tree order.
     * 12. If any member of contained children is a doctype, then throw a
     * "HierarchyRequestError" DOMException.
     */
    const containedChildren: NodeInternal[] = []
    for (const child of commonAncestor.childNodes) {
      if (this.isContained(child as NodeInternal, range)) {
        if (Guard.isDocumentTypeNode(child)) {
          throw DOMException.HierarchyRequestError
        }
        containedChildren.push(child as NodeInternal)
      }
    }

    if (firstPartiallyContainedChild !== null &&
      Guard.isCharacterDataNode(firstPartiallyContainedChild)) {
      /**
       * 13. If first partially contained child is a Text, ProcessingInstruction, 
       * or Comment node:
       * 13.1. Let clone be a clone of original start node.
       * 13.2. Set the data of clone to the result of substringing data with 
       * node original start node, offset original start offset, and count 
       * original start node’s length minus original start offset.
       * 13.3. Append clone to fragment.
       */
      const clone = this.dom.node.clone(originalStartNode) as CharacterDataInternal
      clone._data = this.dom.characterData.substringData(
        originalStartNode as CharacterDataInternal, originalStartOffset,
        this.dom.tree.nodeLength(originalStartNode) - originalStartOffset)
      fragment.append(clone)
    } else if (firstPartiallyContainedChild !== null) {
      /**
       * 14. Otherwise, if first partially contained child is not null:
       * 14.1. Let clone be a clone of first partially contained child.
       * 14.2. Append clone to fragment.
       * 14.3. Let subrange be a new live range whose start is (original start
       * node, original start offset) and whose end is (first partially
       * contained child, first partially contained child’s length).
       * 14.4. Let subfragment be the result of cloning the contents of
       * subrange.
       * 14.5. Append subfragment to clone.
       */
      const clone = this.dom.node.clone(originalStartNode)
      fragment.append(clone)
      const subrange = this.dom.create.range(
        [originalStartNode, originalStartOffset],
        [firstPartiallyContainedChild, this.dom.tree.nodeLength(firstPartiallyContainedChild)])
      const subfragment = this.cloneTheContents(subrange)
      clone.appendChild(subfragment)
    }

    /**
     * 15. For each contained child in contained children, append contained
     * child to fragment.
     * 15.1. Let clone be a clone of contained child with the clone children
     * flag set.
     * 15.2. Append clone to fragment.
     */
    for (const child of containedChildren) {
      const clone = this.dom.node.clone(child)
      fragment.appendChild(clone)
    }

    if (lastPartiallyContainedChild !== null &&
      Guard.isCharacterDataNode(lastPartiallyContainedChild)) {
      /**
       * 16. If last partially contained child is a Text, ProcessingInstruction,
       * or Comment node:
       * 16.1. Let clone be a clone of original end node.
       * 16.2. Set the data of clone to the result of substringing data with
       * node original end node, offset 0, and count original end offset.
       * 16.3. Append clone to fragment.
       */
      const clone = this.dom.node.clone(originalEndNode) as CharacterDataInternal
      clone._data = this.dom.characterData.substringData(
        originalEndNode as CharacterDataInternal, 0, originalEndOffset)
      fragment.append(clone)
    } else if (lastPartiallyContainedChild !== null) {
      /**
       * 17. Otherwise, if last partially contained child is not null:
       * 17.1. Let clone be a clone of last partially contained child.
       * 17.2. Append clone to fragment.
       * 17.3. Let subrange be a new live range whose start is (last partially
       * contained child, 0) and whose end is (original end node, original
       * end offset).
       * 17.4. Let subfragment be the result of cloning the contents of subrange.
       * 17.5. Append subfragment to clone.
       */
      const clone = this.dom.node.clone(lastPartiallyContainedChild)
      fragment.append(clone)
      const subrange = this.dom.create.range(
        [lastPartiallyContainedChild, 0],
        [originalEndNode, originalEndOffset])
      const subfragment = this.extract(subrange)
      clone.appendChild(subfragment)
    }

    /**
     * 18. Return fragment.
     */
    return fragment
  }

  /** @inheritdoc */
  insert(node: NodeInternal, range: AbstractRangeInternal): void {
    /**
     * 1. If range’s start node is a ProcessingInstruction or Comment node, is a
     * Text node whose parent is null, or is node, then throw a
     * "HierarchyRequestError" DOMException.
     */
    if (Guard.isProcessingInstructionNode(range._startNode) ||
      Guard.isCommentNode(range._startNode) ||
      (Guard.isTextNode(range._startNode) && range._startNode._parent === null) ||
      range._startNode === node) {
      throw DOMException.HierarchyRequestError
    }

    /**
     * 2. Let referenceNode be null.
     * 3. If range’s start node is a Text node, set referenceNode to that Text
     * node.
     * 4. Otherwise, set referenceNode to the child of start node whose index is
     * start offset, and null if there is no such child.
     */
    let referenceNode: NodeInternal | null = null
    if (Guard.isTextNode(range._startNode)) {
      referenceNode = range._startNode
    } else {
      let index = 0
      for (const child of range._startNode.childNodes) {
        if (index === range._startOffset) {
          referenceNode = child as NodeInternal
          break
        }
        index++
      }
    }

    /**
     * 5. Let parent be range’s start node if referenceNode is null, and
     * referenceNode’s parent otherwise.
     */
    let parent: NodeInternal
    if (referenceNode === null) {
      parent = range._startNode
    } else {
      if (referenceNode._parent === null) {
        throw new Error("Parent node is null.")
      }
      parent = referenceNode._parent as NodeInternal
    }

    /**
     * 6. Ensure pre-insertion validity of node into parent before referenceNode.
     */
    this.dom.mutation.ensurePreInsertionValidity(node, parent, referenceNode)

    /**
     * 7. If range’s start node is a Text node, set referenceNode to the result
     * of splitting it with offset range’s start offset.
     */
    if (Guard.isTextNode(range._startNode)) {
      referenceNode = this.dom.text.split(range._startNode, range._startOffset)
    }

    /**
     * 8. If node is referenceNode, set referenceNode to its next sibling.
     */
    if (node === referenceNode) {
      referenceNode = node.nextSibling as NodeInternal | null
    }

    /**
     * 9. If node’s parent is not null, remove node from its parent.
     */
    if (node._parent !== null) {
      this.dom.mutation.remove(node, node._parent as NodeInternal)
    }

    /**
     * 10. Let newOffset be parent’s length if referenceNode is null, and
     * referenceNode’s index otherwise.
     */
    let newOffset = (referenceNode === null ?
      this.dom.tree.nodeLength(parent) : this.dom.tree.index(referenceNode))

    /**
     * 11. Increase newOffset by node’s length if node is a DocumentFragment
     * node, and one otherwise.
     */
    if (Guard.isDocumentFragmentNode(node)) {
      newOffset += this.dom.tree.nodeLength(node)
    } else {
      newOffset++
    }

    /**
     * 12. Pre-insert node into parent before referenceNode.
     */
    this.dom.mutation.preInsert(node, parent, referenceNode)

    /**
     * 13. If range is collapsed, then set range’s end to (parent, newOffset).
     */
    if (this.collapsed(range)) {
      range._end = [parent, newOffset]
    }
  }

  /** @inheritdoc */
  *getContainedNodes(range: RangeInternal): IterableIterator<NodeInternal> {
    const container = range.commonAncestorContainer as NodeInternal

    for (const node of this.dom.tree.getDescendantNodes(container)) {
      if (this.isContained(node, range)) yield node
    }
  }

  /** @inheritdoc */
  *getPartiallyContainedNodes(range: RangeInternal): IterableIterator<NodeInternal> {
    const container = range.commonAncestorContainer as NodeInternal

    for (const node of this.dom.tree.getDescendantNodes(container)) {
      if (this.isPartiallyContained(node, range)) yield node
    }
  }

  /** @inheritdoc */
  removeRange(range: RangeInternal, doc: DocumentInternal): void {
    const index = doc._rangeList.indexOf(range)
    if (index > -1) {
      doc._rangeList.splice(index, 1)
    }
  }

}
