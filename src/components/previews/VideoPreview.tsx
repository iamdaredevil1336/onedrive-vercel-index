import type { OdFileObject } from '../../types'

import { FC, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'

import axios from 'axios'
import toast from 'react-hot-toast'
import { useAsync } from 'react-async-hook'
import { useClipboard } from 'use-clipboard-copy'

import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension } from '../../utils/getFileIcon'
import { getStoredToken } from '../../utils/protectedRouteHandler'

import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import FourOhFour from '../FourOhFour'
import Loading from '../Loading'
import CustomEmbedLinkMenu from '../CustomEmbedLinkMenu'

const VideoPlayer: FC<{
  videoName: string
  videoUrl: string
  thumbnail: string
  subtitle: string
  isFlv: boolean
  mpegts: any
}> = ({ videoUrl, thumbnail, subtitle, isFlv, mpegts }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Load subtitles
    axios
      .get(subtitle, { responseType: 'blob' })
      .then(resp => {
        const track = videoRef.current?.querySelector('track')
        if (track) {
          track.src = URL.createObjectURL(resp.data)
        }
      })
      .catch(() => console.log('Could not load subtitle.'))

    // Load FLV using mpegts.js
    if (isFlv && mpegts && videoRef.current) {
      const flvPlayer = mpegts.createPlayer({
        type: 'flv',
        url: videoUrl,
      })
      flvPlayer.attachMediaElement(videoRef.current)
      flvPlayer.load()
    }
  }, [videoUrl, isFlv, mpegts, subtitle])

  return (
    <video
      ref={videoRef}
      className="w-full max-h-[70vh] rounded"
      poster={thumbnail}
      controls
      preload="metadata"
    >
      <track kind="captions" label="Subtitle" default />
    </video>
  )
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)
  const clipboard = useClipboard()
  const { t } = useTranslation()

  const [menuOpen, setMenuOpen] = useState(false)

  const thumbnail = `/api/thumbnail/?path=${asPath}&size=large${hashedToken ? `&odpt=${hashedToken}` : ''}`
  const videoUrl = `/api/raw/?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`

  const vtt = `${asPath.substring(0, asPath.lastIndexOf('.'))}.vtt`
  const subtitle = `/api/raw/?path=${vtt}${hashedToken ? `&odpt=${hashedToken}` : ''}`

  const isFlv = getExtension(file.name) === 'flv'

  const { loading, error, result: mpegts } = useAsync(async () => {
    if (isFlv) {
      return (await import('mpegts.js')).default
    }
  }, [isFlv])

  return (
    <>
      <CustomEmbedLinkMenu path={asPath} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <PreviewContainer>
        {error ? (
          <FourOhFour errorMsg={error.message} />
        ) : loading && isFlv ? (
          <Loading loadingText={t('Loading FLV extension...')} />
        ) : (
          <VideoPlayer
            videoName={file.name}
            videoUrl={videoUrl}
            thumbnail={thumbnail}
            subtitle={subtitle}
            isFlv={isFlv}
            mpegts={mpegts}
          />
        )}
      </PreviewContainer>

      <DownloadBtnContainer>
        <div className="flex flex-wrap justify-center gap-2">
          <DownloadButton
            onClickCallback={() => window.open(videoUrl)}
            btnColor="blue"
            btnText={t('Download')}
            btnIcon="file-download"
          />
          <DownloadButton
            onClickCallback={() => {
              clipboard.copy(`${getBaseUrl()}${videoUrl}`)
              toast.success(t('Copied direct link to clipboard.'))
            }}
            btnColor="pink"
            btnText={t('Copy direct link')}
            btnIcon="copy"
          />
          <DownloadButton
            onClickCallback={() => setMenuOpen(true)}
            btnColor="teal"
            btnText={t('Customise link')}
            btnIcon="pen"
          />
        </div>
      </DownloadBtnContainer>
    </>
  )
}

export default VideoPreview
